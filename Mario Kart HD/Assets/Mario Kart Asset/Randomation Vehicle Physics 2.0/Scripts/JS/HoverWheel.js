#pragma strict
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Hover/Hover Wheel", 1)

//Class for hover vehicle wheels
public class HoverWheel extends MonoBehaviour
{
	private var tr : Transform;
	private var rb : Rigidbody;
	private var vp : VehicleParent;

	@System.NonSerialized
	var contactPoint : HoverContact = new HoverContact();//Contact points of the wheels
	@System.NonSerialized
	var getContact : boolean = true;//Should the wheel try to get contact info?
	@System.NonSerialized
	var grounded : boolean;
	var hoverDistance : float;
	@Tooltip("If the distance to the ground is less than this, extra hovering force will be applied based on the buffer float force")
	var bufferDistance : float;
	private var upDir : Vector3;//Local up direction

	@System.NonSerialized
	var doFloat : boolean;//Is the wheel turned on?
	var floatForce : float = 1;
	var bufferFloatForce : float = 2;

	@Tooltip("Strength of the suspension depending on how compressed it is, x-axis = compression, y-axis = force")
	var floatForceCurve : AnimationCurve = AnimationCurve.Linear(0, 0, 1, 1);
	var floatExponent : float = 1;
	var floatDampening : float;
	private var compression : float;//How compressed the suspension is

	@System.NonSerialized
	var targetSpeed : float;
	@System.NonSerialized
	var targetForce : float;
	private var flippedSideFactor : float;//Multiplier for inverting the forces on opposite sides
	var brakeForce : float = 1;
	var ebrakeForce : float = 2;
	@System.NonSerialized
	var steerRate : float;

	@Tooltip("How much the wheel steers")
	var steerFactor : float;
	var sideFriction : float;

	@Header("Visual Wheel")
	
	var visualWheel : Transform;
	var visualTiltRate : float = 10;
	var visualTiltAmount : float = 0.5f;
	
	private var detachedWheel : GameObject;
	private var detachedCol : MeshCollider ;
	private var detachedBody : Rigidbody;
	private var detachFilter : MeshFilter;
	
	@Header("Damage")

	var detachForce : float = Mathf.Infinity;
	var mass : float = 0.05f;
	@System.NonSerialized
	var connected : boolean = true;
	@System.NonSerialized
	var canDetach : boolean;
	var wheelMeshLoose : Mesh;//Mesh for detached wheel collider
	var detachedWheelMaterial : PhysicMaterial;

	function Start()
	{
		tr = transform;
		rb = F.GetTopmostParentComponent(Rigidbody, tr) as Rigidbody;
		vp = F.GetTopmostParentComponent(VehicleParent, tr) as VehicleParent;
		flippedSideFactor = Vector3.Dot(tr.forward, vp.transform.right) < 0 ? 1 : -1;
		canDetach = detachForce < Mathf.Infinity && Application.isPlaying;
		bufferDistance = Mathf.Min(hoverDistance, bufferDistance);

		if (canDetach)
		{
			detachedWheel = new GameObject(vp.transform.name + "'s Detached Wheel");
			detachedWheel.layer = LayerMask.NameToLayer("Detachable Part");
			detachFilter = detachedWheel.AddComponent(MeshFilter);
			detachFilter.sharedMesh = visualWheel.GetComponent(MeshFilter).sharedMesh;
			var detachRend : MeshRenderer = detachedWheel.AddComponent(MeshRenderer);
			detachRend.sharedMaterial = visualWheel.GetComponent(MeshRenderer).sharedMaterial;
			detachedCol = detachedWheel.AddComponent(MeshCollider);
			detachedCol.convex = true;
			detachedBody = detachedWheel.AddComponent(Rigidbody);
			detachedBody.mass = mass;
			detachedWheel.SetActive(false);
		}
	}

	function Update()
	{
		//Tilt the visual wheel
		if (visualWheel && connected)
		{
			TiltWheel();
		}
	}

	function FixedUpdate()
	{
		upDir = tr.up;

		if (getContact)
		{
			GetWheelContact();
		}
		else if (grounded)
		{
			contactPoint.point += rb.GetPointVelocity(tr.position) * Time.fixedDeltaTime;
		}

		compression = Mathf.Clamp01(contactPoint.distance / (hoverDistance));

		if (grounded && doFloat && connected)
		{
			ApplyFloat();
			ApplyFloatDrive();
		}
	}

	//Get the contact point of the wheel
	function GetWheelContact()
	{
		var hit : RaycastHit = new RaycastHit();
		var localVel : Vector3 = rb.GetPointVelocity(tr.position);
		var wheelHits : RaycastHit[] = Physics.RaycastAll(tr.position, -upDir, hoverDistance, GlobalControl.wheelCastMaskStatic);
		var validHit : boolean = false;
		var hitDist : float = Mathf.Infinity;

		//Loop through contact points to get the closest one
		for (var curHit : RaycastHit in wheelHits)
		{
			if (!curHit.transform.IsChildOf(vp.tr) && curHit.distance < hitDist)
			{
				hit = curHit;
				hitDist = curHit.distance;
				validHit = true;
			}
		}

		//Set contact point variables
		if (validHit)
		{
			if (!hit.collider.transform.IsChildOf(vp.tr))
			{
				grounded = true;
				contactPoint.distance = hit.distance;
				contactPoint.point = hit.point + localVel * Time.fixedDeltaTime;
				contactPoint.grounded = true;
				contactPoint.normal = hit.normal;
				contactPoint.relativeVelocity = tr.InverseTransformDirection(localVel);
				contactPoint.col = hit.collider;
			}
		}
		else
		{
			grounded = false;
			contactPoint.distance = hoverDistance;
			contactPoint.point = Vector3.zero;
			contactPoint.grounded = false;
			contactPoint.normal = upDir;
			contactPoint.relativeVelocity = Vector3.zero;
			contactPoint.col = null;
		}
	}

	//Make the vehicle hover
	function ApplyFloat()
	{
		if (grounded)
		{
			//Get the vertical speed of the wheel
			var travelVel : float = vp.norm.InverseTransformDirection(rb.GetPointVelocity(tr.position)).z;

			rb.AddForceAtPosition(upDir * floatForce * (Mathf.Pow(floatForceCurve.Evaluate(1 - compression), Mathf.Max(1, floatExponent)) - floatDampening * Mathf.Clamp(travelVel, -1, 1))
				, tr.position
				, ForceMode.Acceleration);

			if (contactPoint.distance < bufferDistance)
			{
				rb.AddForceAtPosition(-upDir * bufferFloatForce * floatForceCurve.Evaluate(contactPoint.distance / bufferDistance) * Mathf.Clamp(travelVel, -1, 0)
					, tr.position
					, ForceMode.Acceleration);
			}
		}
	}

	//Drive the vehicle
	function ApplyFloatDrive()
	{
		//Get proper brake force
		var actualBrake : float = (vp.localVelocity.z > 0 ? vp.brakeInput : Mathf.Clamp01(vp.accelInput)) * brakeForce + vp.ebrakeInput * ebrakeForce;

		rb.AddForceAtPosition(
			tr.TransformDirection(
				(Mathf.Clamp(targetSpeed, -1, 1) * targetForce - actualBrake * Mathf.Max(5, Mathf.Abs(contactPoint.relativeVelocity.x)) * Mathf.Sign(contactPoint.relativeVelocity.x) * flippedSideFactor) * flippedSideFactor,
				0,
			    -steerRate * steerFactor * flippedSideFactor - contactPoint.relativeVelocity.z * sideFriction) * (1 - compression),
			tr.position,
			ForceMode.Acceleration);
	}

	//Tilt the visual wheel
	function TiltWheel()
	{
		var sideTilt : float = Mathf.Clamp(-steerRate * steerFactor * flippedSideFactor - Mathf.Clamp(contactPoint.relativeVelocity.z * 0.1f, -1, 1) * sideFriction, -1, 1);
		var actualBrake : float = (vp.localVelocity.z > 0 ? vp.brakeInput : Mathf.Clamp01(vp.accelInput)) * brakeForce + vp.ebrakeInput * ebrakeForce;
		var forwardTilt : float = Mathf.Clamp((Mathf.Clamp(targetSpeed, -1, 1) * targetForce - actualBrake * Mathf.Clamp(contactPoint.relativeVelocity.x * 0.1f, -1, 1) * flippedSideFactor) * flippedSideFactor, -1, 1);

		visualWheel.localRotation = Quaternion.Lerp(visualWheel.localRotation, Quaternion.LookRotation(new Vector3(-forwardTilt * visualTiltAmount, -1 + Mathf.Abs(F.MaxAbs(sideTilt, forwardTilt)) * visualTiltAmount, -sideTilt * visualTiltAmount).normalized, Vector3.forward), visualTiltRate * Time.deltaTime);
	}
	
	public function Detach()
	{
		if (connected && canDetach)
		{
			connected = false;
			detachedWheel.SetActive(true);
			detachedWheel.transform.position = visualWheel.position;
			detachedWheel.transform.rotation = visualWheel.rotation;
			detachedCol.sharedMaterial = detachedWheelMaterial;
			detachedCol.sharedMesh = wheelMeshLoose ? wheelMeshLoose : detachFilter.sharedMesh;
			
			rb.mass -= mass;
			detachedBody.velocity = rb.GetPointVelocity(visualWheel.position);
			detachedBody.angularVelocity = rb.angularVelocity;
			
			visualWheel.gameObject.SetActive(false);
		}
	}

	public function Reattach()
	{
		if (!connected)
		{
			connected = true;
			detachedWheel.SetActive(false);
			rb.mass += mass;
			visualWheel.gameObject.SetActive(true);
		}
	}
	
	function OnDrawGizmosSelected()
	{
		tr = transform;
		//Draw a ray to show the distance of the "suspension"
		Gizmos.color = Color.white;
		Gizmos.DrawRay(tr.position, -tr.up * hoverDistance);
		Gizmos.color = Color.red;
		Gizmos.DrawRay(tr.position, -tr.up * bufferDistance);
	}
	
	//Destroy detached wheel
	function OnDestroy()
	{
		if (detachedWheel)
		{
			Destroy(detachedWheel);
		}
	}
}

//Class for the contact point
public class HoverContact
{
	var grounded : boolean;//Is it grounded?
	var col : Collider;//Collider of the contact point
	var point : Vector3;//Position of the contact point
	var normal : Vector3;//Normal of the contact point
	var relativeVelocity : Vector3;//Velocity of the wheel relative to the contact point
	var distance : float;//Distance from the wheel to the contact point
}