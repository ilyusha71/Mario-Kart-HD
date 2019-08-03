#pragma strict
@script RequireComponent(Rigidbody)
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Vehicle Controllers/Vehicle Parent", 0)

//Vehicle root class
public class VehicleParent extends MonoBehaviour
{
	@System.NonSerialized
	var rb : Rigidbody;
	@System.NonSerialized
	var tr : Transform;
	@System.NonSerialized
	var norm : Transform;//Normal orientation object

	@System.NonSerialized
	var accelInput : float;
	@System.NonSerialized
	var brakeInput : float;
	@System.NonSerialized
	var steerInput : float;
	@System.NonSerialized
	var ebrakeInput : float;
	@System.NonSerialized
	var boostButton : boolean;
	@System.NonSerialized
	var upshiftPressed : boolean;
	@System.NonSerialized
	var downshiftPressed : boolean;
	@System.NonSerialized
	var upshiftHold : float;
	@System.NonSerialized
	var downshiftHold : float;
	@System.NonSerialized
	var pitchInput : float;
	@System.NonSerialized
	var yawInput : float;
	@System.NonSerialized
	var rollInput : float;

	@Tooltip("Accel axis is used for brake input")
	var accelAxisIsBrake : boolean;

	@Tooltip("Brake input will act as reverse input")
	var brakeIsReverse : boolean;

	@Tooltip("Automatically hold ebrake if it's pressed while parked")
	var holdEbrakePark : boolean;
	
	var burnoutThreshold : float = 0.9f;
	@System.NonSerialized
	var burnout : float;
	var burnoutSpin : float = 5;
	@RangeAttribute(0, 0.9f)
	var burnoutSmoothness : float = 0.5f;
	var engine : Motor;

	private var stopUpshift : boolean;
	private var stopDownShift : boolean;

	@System.NonSerialized
	var localVelocity : Vector3;//Local space velocity
	@System.NonSerialized
	var localAngularVel : Vector3;//Local space angular velocity
	@System.NonSerialized
	var forwardDir : Vector3;//Forward direction
	@System.NonSerialized
	var rightDir : Vector3;//Right direction
	@System.NonSerialized
	var upDir : Vector3;//Up direction
	@System.NonSerialized
	var forwardDot : float;//Dot product between forwardDir and GlobalControl.worldUpDir
	@System.NonSerialized
	var rightDot : float;//Dot product between rightDir and GlobalControl.worldUpDir
	@System.NonSerialized
	var upDot : float;//Dot product between upDir and GlobalControl.worldUpDir
	@System.NonSerialized
	var velMag : float;//Velocity magnitude
	@System.NonSerialized
	var sqrVelMag : float;//Velocity squared magnitude

	@System.NonSerialized
	var reversing : boolean;

	var wheels : Wheel[];
	var hoverWheels : HoverWheel[];
	var wheelGroups : WheelCheckGroup[];
	private var wheelLoopDone : boolean = false;
	var hover : boolean;
	@System.NonSerialized
	var groundedWheels : int;//Number of wheels grounded
	@System.NonSerialized
	var wheelNormalAverage : Vector3;//Average normal of the wheel contact points
	private var wheelContactsVelocity : Vector3;//Average velocity of wheel contact points

	@Tooltip("Lower center of mass by suspension height")
	var suspensionCenterOfMass : boolean;
	var centerOfMassOffset : Vector3;

	@Tooltip("Tow vehicle to instantiate")
	var towVehicle : GameObject;
	private var newTow : GameObject;
	@System.NonSerialized
	var inputInherit : VehicleParent;//Vehicle which to inherit input from
	
	@System.NonSerialized
	var crashing : boolean;

	@Header("Crashing")

	var canCrash : boolean = true;
	var crashSnd : AudioSource;
	var crashClips : AudioClip[];
	@System.NonSerialized
	var playCrashSounds : boolean = true;
	var sparks : ParticleSystem;
	@System.NonSerialized
	var playCrashSparks : boolean = true;

	@Header("Camera")

	var cameraDistanceChange : float;
	var cameraHeightChange : float;

	function Start()
	{
		tr = transform;
		rb = GetComponent(Rigidbody);

		//Create normal orientation object
		var normTemp : GameObject = new GameObject(tr.name + "'s Normal Orientation");
		norm = normTemp.transform;

		SetCenterOfMass();

		//Instantiate tow vehicle
		if (towVehicle)
		{
			newTow = Instantiate(towVehicle, Vector3.zero, tr.rotation) as GameObject;
			newTow.SetActive(false);
			newTow.transform.position = tr.TransformPoint(newTow.GetComponent(Joint).connectedAnchor - newTow.GetComponent(Joint).anchor);
			newTow.GetComponent(Joint).connectedBody = rb;
			newTow.SetActive(true);
			newTow.GetComponent(VehicleParent).inputInherit = this;
		}
		
		if (sparks)
		{
			sparks.transform.parent = null;
		}
		
		if (wheelGroups.Length > 0)
		{
			StartCoroutine(WheelCheckLoop());
		}
	}

	function Update()
	{
		//Shift single frame pressing logic
		if (stopUpshift)
		{
			upshiftPressed = false;
			stopUpshift = false;
		}

		if (stopDownShift)
		{
			downshiftPressed = false;
			stopDownShift = false;
		}

		if (upshiftPressed)
		{
			stopUpshift = true;
		}

		if (downshiftPressed)
		{
			stopDownShift = true;
		}

		if (inputInherit)
		{
			InheritInputOneShot();
		}

		//Norm orientation visualizing
		//Debug.DrawRay(norm.position, norm.forward, Color.blue);
		//Debug.DrawRay(norm.position, norm.up, Color.green);
		//Debug.DrawRay(norm.position, norm.right, Color.red);
	}

	function FixedUpdate()
	{
		if (inputInherit)
		{
			InheritInput();
		}
		
		if (wheelLoopDone && wheelGroups.Length > 0)
		{
			wheelLoopDone = false;
			StartCoroutine(WheelCheckLoop());
		}

		GetGroundedWheels();

		if (groundedWheels > 0)
		{
			crashing = false;
		}

		localVelocity = tr.InverseTransformDirection(rb.velocity - wheelContactsVelocity);
		localAngularVel = tr.InverseTransformDirection(rb.angularVelocity);
		velMag = rb.velocity.magnitude;
		sqrVelMag = rb.velocity.sqrMagnitude;
		forwardDir = tr.forward;
		rightDir = tr.right;
		upDir = tr.up;
		forwardDot = Vector3.Dot(forwardDir, GlobalControl.worldUpDir);
		rightDot = Vector3.Dot(rightDir, GlobalControl.worldUpDir);
		upDot = Vector3.Dot(upDir, GlobalControl.worldUpDir);
		norm.transform.position = tr.position;
		norm.transform.rotation = Quaternion.LookRotation(groundedWheels == 0 ? upDir : wheelNormalAverage, forwardDir);

		//Check if performing a burnout
		if (groundedWheels > 0 && !hover && !accelAxisIsBrake && burnoutThreshold >= 0 && accelInput > burnoutThreshold && brakeInput > burnoutThreshold)
		{
			burnout = Mathf.Lerp(burnout, ((5 - Mathf.Min(5, Mathf.Abs(localVelocity.z))) / 5) * Mathf.Abs(accelInput), Time.fixedDeltaTime * (1 - burnoutSmoothness) * 10);
		}
		else if (burnout > 0.01f)
		{
			burnout = Mathf.Lerp(burnout, 0, Time.fixedDeltaTime * (1 - burnoutSmoothness) * 10);
		}
		else
		{
			burnout = 0;
		}
		
		if (engine)
		{
			burnout *= engine.health;
		}
		
		//Check if reversing
		if (brakeIsReverse && brakeInput > 0 && localVelocity.z < 1 && burnout == 0)
		{
			reversing = true;
		}
		else if (localVelocity.z >= 0 || burnout > 0)
		{
			reversing = false;
		}
	}

	public function SetAccel(f : float)
	{
		f = Mathf.Clamp(f, -1 , 1);
		accelInput = f;
	}

	public function SetBrake(f : float)
	{
		brakeInput = accelAxisIsBrake ? -Mathf.Clamp(accelInput, -1, 0) : Mathf.Clamp(f, -1 , 1);
	}

	public function SetSteer(f : float)
	{
		steerInput = Mathf.Clamp(f, -1 , 1);
	}

	public function SetEbrake(f : float)
	{
		if ((f > 0 || ebrakeInput > 0) && holdEbrakePark && velMag < 1 && accelInput == 0 && (brakeInput == 0 || !brakeIsReverse))
		{
			ebrakeInput = 1;
		}
		else
		{
			ebrakeInput = Mathf.Clamp01(f);
		}
	}

	public function SetBoost(b : boolean)
	{
		boostButton = b;
	}

	public function SetPitch(f : float)
	{
		pitchInput = Mathf.Clamp(f, -1 , 1);
	}

	public function SetYaw(f : float)
	{
		yawInput = Mathf.Clamp(f, -1 , 1);
	}

	public function SetRoll(f : float)
	{
		rollInput = Mathf.Clamp(f, -1 , 1);
	}

	public function PressUpshift()
	{
		upshiftPressed = true;
	}

	public function PressDownshift()
	{
		downshiftPressed = true;
	}

	public function SetUpshift(f : float)
	{
		upshiftHold = f;
	}

	public function SetDownshift(f : float)
	{
		downshiftHold = f;
	}

	function InheritInput()
	{
		accelInput = inputInherit.accelInput;
		brakeInput = inputInherit.brakeInput;
		steerInput = inputInherit.steerInput;
		ebrakeInput = inputInherit.ebrakeInput;
		pitchInput = inputInherit.pitchInput;
		yawInput = inputInherit.yawInput;
		rollInput = inputInherit.rollInput;
	}

	function InheritInputOneShot()
	{
		upshiftPressed = inputInherit.upshiftPressed;
		downshiftPressed = inputInherit.downshiftPressed;
	}

	function SetCenterOfMass()
	{
		var susAverage : float = 0;

		//Get average suspension height
		if (suspensionCenterOfMass)
		{
			if (hover)
			{
				for (var i : int = 0; i < hoverWheels.Length; i++)
				{
					susAverage = i == 0 ? hoverWheels[i].hoverDistance : (susAverage + hoverWheels[i].hoverDistance) * 0.5f;
				}
			}
			else
			{
				for (var j : int = 0; j < wheels.Length; j++)
				{
					var newSusDist : float = wheels[j].transform.parent.GetComponent(Suspension).suspensionDistance;
					susAverage = j == 0 ? newSusDist : (susAverage + newSusDist) * 0.5f;
				}
			}
		}

	    rb.centerOfMass = centerOfMassOffset + new Vector3(0, -susAverage, 0);
	    var tempTensor : Vector3 = rb.inertiaTensor;//Declare temporary variable for the sake of avoiding warning message regarding assigning a variable to itself
		rb.inertiaTensor = tempTensor;//This is required due to decoupling of inertia tensor from center of mass in Unity 5.3
	}

	function GetGroundedWheels()
	{
		groundedWheels = 0;
		wheelContactsVelocity = Vector3.zero;

		if (hover)
		{
			for (var i : int = 0; i < hoverWheels.Length; i++)
			{

				if (hoverWheels[i].grounded)
				{
					wheelNormalAverage = i == 0 ? hoverWheels[i].contactPoint.normal : (wheelNormalAverage + hoverWheels[i].contactPoint.normal).normalized;
				}

				if (hoverWheels[i].grounded)
				{
					groundedWheels ++;
				}
			}
		}
		else
		{
			for (var j : int = 0; j < wheels.Length; j++)
			{
				if (wheels[j].grounded)
				{
					wheelContactsVelocity = j == 0 ? wheels[j].contactVelocity : (wheelContactsVelocity + wheels[j].contactVelocity) * 0.5f;
					wheelNormalAverage = j == 0 ? wheels[j].contactPoint.normal : (wheelNormalAverage + wheels[j].contactPoint.normal).normalized;
				}

				if (wheels[j].grounded)
				{
					groundedWheels ++;
				}
			}
		}
	}

	//Check for crashes and play collision sounds
	function OnCollisionEnter(col : Collision)
	{
		if (col.contacts.Length > 0 && groundedWheels == 0)
		{
			for (var curCol : ContactPoint in col.contacts)
			{
				if (!curCol.thisCollider.CompareTag("Underside") && curCol.thisCollider.gameObject.layer != GlobalControl.ignoreWheelCastLayer)
				{
					if (Vector3.Dot(curCol.normal, col.relativeVelocity.normalized) > 0.2f && col.relativeVelocity.sqrMagnitude > 20)
					{
						var checkTow : boolean = true;
						if (newTow)
						{
							checkTow = !curCol.otherCollider.transform.IsChildOf(newTow.transform);
						}

						if (checkTow)
						{
							crashing = canCrash;

							if (crashSnd && crashClips.Length > 0 && playCrashSounds)
							{
								crashSnd.PlayOneShot(crashClips[Random.Range(0, crashClips.Length)], Mathf.Clamp01(col.relativeVelocity.magnitude * 0.1f));
							}

							if (sparks && playCrashSparks)
							{
								sparks.transform.position = curCol.point;
								sparks.transform.rotation = Quaternion.LookRotation(col.relativeVelocity.normalized, curCol.normal);
								sparks.Play();
							}
						}
					}
				}
			}
		}
	}

	function OnCollisionStay(col : Collision)
	{
		if (col.contacts.Length > 0 && groundedWheels == 0)
		{
			for (var curCol : ContactPoint in col.contacts)
			{
				if (!curCol.thisCollider.CompareTag("Underside") && curCol.thisCollider.gameObject.layer != GlobalControl.ignoreWheelCastLayer)
				{
					if (col.relativeVelocity.sqrMagnitude < 5)
					{
						var checkTow : boolean = true;

						if (newTow)
						{
							checkTow = !curCol.otherCollider.transform.IsChildOf(newTow.transform);
						}

						if (checkTow)
						{
							crashing = canCrash;
						}
					}
				}
			}
		}
	}
	
	function OnDestroy()
	{
		if (norm)
		{
			Destroy(norm.gameObject);
		}

		if (sparks)
		{
			Destroy(sparks.gameObject);
		}
	}
	
	//Loop through all wheel groups to check for wheel contacts
	function WheelCheckLoop()
	{
		for (var i : int = 0; i < wheelGroups.Length; i++)
		{
			wheelGroups[i].Activate();
			wheelGroups[i == 0 ? wheelGroups.Length - 1 : i - 1].Deactivate();
			yield new WaitForFixedUpdate();
		}

		wheelLoopDone = true;
	}
}

//Class for groups of wheels to check each FixedUpdate
@System.Serializable
public class WheelCheckGroup
{
	var wheels : Wheel[];
	var hoverWheels : HoverWheel[];

	public function Activate()
	{
		for (var curWheel : Wheel in wheels)
		{
			curWheel.getContact = true;
		}

		for (var curHover : HoverWheel in hoverWheels)
		{
			curHover.getContact = true;
		}
	}

	public function Deactivate()
	{
		for (var curWheel : Wheel in wheels)
		{
			curWheel.getContact = false;
		}
		
		for (var curHover : HoverWheel in hoverWheels)
		{
			curHover.getContact = false;
		}
	}
}