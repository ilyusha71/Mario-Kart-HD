#pragma strict
@script RequireComponent(DriveForce)
@ExecuteInEditMode
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Drivetrain/Wheel", 1)

//Class for the wheel
public class Wheel extends MonoBehaviour
{
	@System.NonSerialized
	var tr : Transform;
	private var rb : Rigidbody;
	@System.NonSerialized
	var vp : VehicleParent;
	@System.NonSerialized
	var suspensionParent : Suspension;
	@System.NonSerialized
	var rim : Transform;
	private var tire : Transform;
	private var localVel : Vector3;

	@Tooltip("Generate a sphere collider to represent the wheel for side collisions")
	var generateHardCollider : boolean = true;
	private var sphereCol : SphereCollider;//Hard collider
	private var sphereColTr : Transform;//Hard collider transform
	
	@Header("Rotation")
	
	@Tooltip("Bias for feedback RPM lerp between target RPM and raw RPM")
	@RangeAttribute(0, 1)
	var feedbackRpmBias : float;

	@Tooltip("Curve for setting final RPM of wheel based on driving torque/brake force, x-axis = torque/brake force, y-axis = lerp between raw RPM and target RPM")
	var rpmBiasCurve : AnimationCurve = AnimationCurve.Linear(0, 0, 1, 1);
	
	@Tooltip("As the RPM of the wheel approaches this value, the RPM bias curve is interpolated with the default linear curve")
	var rpmBiasCurveLimit : float = Mathf.Infinity;
	
	@RangeAttribute(0, 10)
	var axleFriction : float;

	@Header("Friction")

	@RangeAttribute(0, 1)
    var frictionSmoothness : float = 0.5f;
	var forwardFriction : float = 1;
	var sidewaysFriction : float = 1;
	var forwardRimFriction : float = 0.5f;
	var sidewaysRimFriction : float = 0.5f;
	var forwardCurveStretch : float = 1;
	var sidewaysCurveStretch : float = 1;
	private var frictionForce : Vector3 = Vector3.zero;

	@Tooltip("X-axis = slip, y-axis = friction")
	var forwardFrictionCurve : AnimationCurve = AnimationCurve.Linear(0, 0, 1, 1);

	@Tooltip("X-axis = slip, y-axis = friction")
	var sidewaysFrictionCurve : AnimationCurve = AnimationCurve.Linear(0, 0, 1, 1);
	@System.NonSerialized
	var forwardSlip : float;
	@System.NonSerialized
	var sidewaysSlip : float;
	public enum SlipDependenceMode {dependent, forward, sideways, independent};
	var slipDependence : SlipDependenceMode = SlipDependenceMode.sideways;
	@RangeAttribute(0, 2)
	var forwardSlipDependence : float = 2;
	@RangeAttribute(0, 2)
	var sidewaysSlipDependence : float = 2;
	
	@Tooltip("Adjusts how much friction the wheel has based on the normal of the ground surface. X-axis = normal dot product, y-axis = friction multiplier")
	var normalFrictionCurve : AnimationCurve = AnimationCurve.Linear(0, 1, 1, 1);

	@Header("Size")

	var tireRadius : float;
	var rimRadius : float;
	var tireWidth : float;
	var rimWidth : float;

	@System.NonSerialized
	var setTireWidth : float;
	@System.NonSerialized
	var tireWidthPrev : float;
	@System.NonSerialized
	var setTireRadius : float;
	@System.NonSerialized
	var tireRadiusPrev : float;

	@System.NonSerialized
	var setRimWidth : float;
	@System.NonSerialized
	var rimWidthPrev : float;
	@System.NonSerialized
	var setRimRadius : float;
	@System.NonSerialized
	var rimRadiusPrev : float;

	@System.NonSerialized
	var actualRadius : float;

	@Header("Tire")

	@RangeAttribute(0, 1)
	var tirePressure : float = 1;
	@System.NonSerialized
	var setTirePressure : float;
	@System.NonSerialized
	var tirePressurePrev : float;
	private var initialTirePressure : float;
	var popped : boolean;
	@System.NonSerialized
	var setPopped : boolean;
	@System.NonSerialized
	var poppedPrev : boolean;
	var canPop : boolean;

	@Tooltip("Requires deform shader")
	var deformAmount : float;
	private var rimMat : Material ;
	private var tireMat : Material;
	private var airLeakTime : float = -1;
	
	@RangeAttribute(0, 1)
	var rimGlow : float;
	private var glowAmount : float;
	private var glowColor : Color;

	@System.NonSerialized
	var updatedSize : boolean;
	@System.NonSerialized
	var updatedPopped : boolean;

	private var currentRPM : float;
	@System.NonSerialized
	var targetDrive : DriveForce;
	@System.NonSerialized
	var rawRPM : float;//RPM based purely on velocity
	@System.NonSerialized
	var contactPoint : WheelContact = new WheelContact();
	@System.NonSerialized
	var getContact : boolean = true;//Should the wheel try to get contact info?
	@System.NonSerialized
	var grounded : boolean;
	private var airTime : float;
	@System.NonSerialized
	var travelDist : float;
	private var upDir : Vector3;//Up direction
	private var circumference : float;

	@System.NonSerialized
	var contactVelocity : Vector3;//Velocity of contact point
	private var actualEbrake : float;
	private var actualTargetRPM : float;
	private var actualTorque : float;

	@System.NonSerialized
	var forceApplicationPoint : Vector3;//Point at which friction forces are applied

	@Tooltip("Apply friction forces at ground point")
	var applyForceAtGroundContact : boolean;
	
	@Header("Audio")

	var impactSnd : AudioSource;
	var tireHitClips : AudioClip[];
	var rimHitClip : AudioClip;
	var tireAirClip : AudioClip;
	var tirePopClip : AudioClip;
	
	@Header("Damage")

	var detachForce : float = Mathf.Infinity;
	@System.NonSerialized
	var damage : float;
	var mass : float = 0.05f;
	@System.NonSerialized
	var canDetach : boolean;
	@System.NonSerialized
	var connected : boolean = true;
	
	var tireMeshLoose : Mesh;//Tire mesh for detached wheel collider
	var rimMeshLoose : Mesh;//Rim mesh for detached wheel collider
	private var detachedWheel : GameObject;
	private var detachedTire : GameObject;
	private var detachedCol : MeshCollider;
	private var detachedBody : Rigidbody;
	private var detachFilter : MeshFilter;
	private var detachTireFilter : MeshFilter;
	var detachedTireMaterial : PhysicMaterial;
	var detachedRimMaterial : PhysicMaterial;

	function Start()
	{
		tr = transform;
		rb = F.GetTopmostParentComponent(Rigidbody, tr) as Rigidbody;
		vp = F.GetTopmostParentComponent(VehicleParent, tr) as VehicleParent;
		suspensionParent = tr.parent.GetComponent(Suspension);
		travelDist = suspensionParent.targetCompression;
		canDetach = detachForce < Mathf.Infinity && Application.isPlaying;
		initialTirePressure = tirePressure;

		if (tr.childCount > 0)
		{
			//Get rim
			rim = tr.GetChild(0);

			//Set up rim glow material
			if (rimGlow > 0 && Application.isPlaying)
			{
				rimMat = new Material(rim.GetComponent(MeshRenderer).sharedMaterial);
				rimMat.EnableKeyword("_EMISSION");
				rim.GetComponent(MeshRenderer).material = rimMat;
			}

			//Create detached wheel
			if (canDetach)
			{
				detachedWheel = new GameObject(vp.transform.name + "'s Detached Wheel");
				detachedWheel.layer = LayerMask.NameToLayer("Detachable Part");
				detachFilter = detachedWheel.AddComponent(MeshFilter);
				detachFilter.sharedMesh = rim.GetComponent(MeshFilter).sharedMesh;
				var detachRend : MeshRenderer = detachedWheel.AddComponent(MeshRenderer);
				detachRend.sharedMaterial = rim.GetComponent(MeshRenderer).sharedMaterial;
				detachedCol = detachedWheel.AddComponent(MeshCollider);
				detachedCol.convex = true;
				detachedBody = detachedWheel.AddComponent(Rigidbody);
				detachedBody.mass = mass;
			}

			//Get tire
			if (rim.childCount > 0)
			{
				tire = rim.GetChild(0);
				if (deformAmount > 0 && Application.isPlaying)
				{
					tireMat = new Material(tire.GetComponent(MeshRenderer).sharedMaterial);
					tire.GetComponent(MeshRenderer).material = tireMat;
				}

				//Create detached tire
				if (canDetach)
				{
					detachedTire = new GameObject("Detached Tire");
					detachedTire.transform.parent = detachedWheel.transform;
					detachedTire.transform.localPosition = Vector3.zero;
					detachedTire.transform.localRotation = Quaternion.identity;
					detachTireFilter = detachedTire.AddComponent(MeshFilter);
					detachTireFilter.sharedMesh = tire.GetComponent(MeshFilter).sharedMesh;
					var detachTireRend : MeshRenderer = detachedTire.AddComponent(MeshRenderer);
					detachTireRend.sharedMaterial = tireMat ? tireMat : tire.GetComponent(MeshRenderer).sharedMaterial;
				}
			}

			if (Application.isPlaying)
			{
				//Generate hard collider
				if (generateHardCollider)
				{
					var sphereColNew : GameObject = new GameObject("Rim Collider");
					sphereColNew.layer = GlobalControl.ignoreWheelCastLayer;
					sphereColTr = sphereColNew.transform;
					sphereCol = sphereColNew.AddComponent(SphereCollider);
					sphereColTr.parent = tr;
					sphereColTr.localPosition = Vector3.zero;
					sphereColTr.localRotation = Quaternion.identity;
					sphereCol.radius = Mathf.Min(rimWidth * 0.5f, rimRadius * 0.5f);
					sphereCol.material = GlobalControl.frictionlessMatStatic;
				}

				if (canDetach)
				{
					detachedWheel.SetActive(false);
				}
			}
		}

		targetDrive = GetComponent(DriveForce);
		currentRPM = 0;
	}
	
	function FixedUpdate()
	{
		upDir = tr.up;
		actualRadius = popped ? rimRadius : Mathf.Lerp(rimRadius, tireRadius, tirePressure);
		circumference = Mathf.PI * actualRadius * 2;
		localVel = rb.GetPointVelocity(forceApplicationPoint);

		//Get proper inputs
		actualEbrake = suspensionParent.ebrakeEnabled ? suspensionParent.ebrakeForce : 0;
		actualTargetRPM = targetDrive.rpm * (suspensionParent.driveInverted ? -1 : 1);
		actualTorque = suspensionParent.driveEnabled ? Mathf.Lerp(targetDrive.torque, Mathf.Abs(vp.accelInput), vp.burnout) : 0;

		if (getContact)
		{
			GetWheelContact();
		}
		else if (grounded)
		{
			contactPoint.point += localVel * Time.fixedDeltaTime;
		}

		airTime = grounded ? 0 : airTime + Time.fixedDeltaTime;
		forceApplicationPoint = applyForceAtGroundContact ? contactPoint.point : tr.position;

		if (connected)
		{
			GetRawRPM();
			ApplyDrive();
		}
		else
		{
			rawRPM = 0;
			currentRPM = 0;
			targetDrive.feedbackRPM = 0;
		}

		//Get travel distance
		travelDist = suspensionParent.compression < travelDist || grounded ? suspensionParent.compression : Mathf.Lerp(travelDist, suspensionParent.compression, suspensionParent.extendSpeed * Time.fixedDeltaTime);

		PositionWheel();

		if (connected)
		{
			//Update hard collider size upon changed radius or width
			if (generateHardCollider)
			{
				setRimWidth = rimWidth;
				setRimRadius = rimRadius;
				setTireWidth = tireWidth;
				setTireRadius = tireRadius;
				setTirePressure = tirePressure;

				if (rimWidthPrev != setRimWidth || rimRadiusPrev != setRimRadius)
				{
					sphereCol.radius = Mathf.Min(rimWidth * 0.5f, rimRadius * 0.5f);
					updatedSize = true;
				}
				else if (tireWidthPrev != setTireWidth || tireRadiusPrev != setTireRadius || tirePressurePrev != setTirePressure)
				{
					updatedSize = true;
				}
				else
				{
					updatedSize = false;
				}

				rimWidthPrev = setRimWidth;
				rimRadiusPrev = setRimRadius;
				tireWidthPrev = setTireWidth;
				tireRadiusPrev = setTireRadius;
				tirePressurePrev = setTirePressure;
			}

			GetSlip();
			ApplyFriction();

			//Burnout spinning
			if (vp.burnout > 0 && targetDrive.rpm != 0 && actualEbrake * vp.ebrakeInput == 0 && connected && grounded)
			{
				rb.AddForceAtPosition(suspensionParent.forwardDir * -suspensionParent.flippedSideFactor * (vp.steerInput * vp.burnoutSpin * currentRPM * Mathf.Min(0.1f, targetDrive.torque) * 0.001f) * vp.burnout * (popped ? 0.5f : 1) * contactPoint.surfaceFriction, suspensionParent.tr.position, ForceMode.Acceleration);
			}

			//Popping logic
			setPopped = popped;

			if (poppedPrev != setPopped)
			{
				if (tire)
				{
					tire.gameObject.SetActive(!popped);
				}
				
				updatedPopped = true;
			}
			else
			{
				updatedPopped = false;
			}

			poppedPrev = setPopped;

			//Air leak logic
			if (airLeakTime >= 0)
			{
				tirePressure = Mathf.Clamp01(tirePressure - Time.fixedDeltaTime * 0.5f);

				if (grounded)
				{
					airLeakTime += Mathf.Max(Mathf.Abs(currentRPM) * 0.001f, localVel.magnitude * 0.1f) * Time.timeScale * TimeMaster.inverseFixedTimeFactor;

					if (airLeakTime > 1000  && tirePressure == 0)
					{
						popped = true;
						airLeakTime = -1;

						if (impactSnd && tirePopClip)
						{
							impactSnd.PlayOneShot(tirePopClip);
							impactSnd.pitch = 1;
						}
					}
				}
			}
		}
	}
	
	function Update()
	{
		RotateWheel();

		if (!Application.isPlaying)
		{
			PositionWheel();
		}
		else
		{
			if (deformAmount > 0 && tireMat && connected)
			{
				if (tireMat.HasProperty("_DeformNormal"))
				{
					//Deform tire (requires deform shader)
					var deformNormal : Vector3 = grounded ? contactPoint.normal * Mathf.Max(-suspensionParent.penetration * (1 - suspensionParent.compression) * 10, 1 - tirePressure) * deformAmount : Vector3.zero;
					tireMat.SetVector("_DeformNormal", new Vector4(deformNormal.x, deformNormal.y, deformNormal.z, 0));
				}
			}

			if (rimMat)
			{
				if (rimMat.HasProperty("_EmissionColor"))
				{
					//Make the rim glow
					var targetGlow : float = connected && GroundSurfaceMaster.surfaceTypesStatic[contactPoint.surfaceType].leaveSparks ? Mathf.Abs(F.MaxAbs(forwardSlip, sidewaysSlip)) : 0;
					glowAmount = popped ? Mathf.Lerp(glowAmount, targetGlow, (targetGlow > glowAmount ? 2 : 0.2f) * Time.deltaTime) : 0;
					glowColor = new Color(glowAmount, glowAmount * 0.5f, 0);
					rimMat.SetColor("_EmissionColor", popped ? Color.Lerp(Color.black, glowColor, glowAmount * rimGlow) : Color.black);
				}
			}
		}
	}
	
	function GetWheelContact()
	{
		var castDist : float = Mathf.Max(suspensionParent.suspensionDistance * Mathf.Max(0.001f, suspensionParent.targetCompression) + actualRadius, 0.001f);
		var wheelHits : RaycastHit[] = Physics.RaycastAll(suspensionParent.maxCompressPoint, suspensionParent.springDirection, castDist, GlobalControl.wheelCastMaskStatic);
		var hit : RaycastHit;
		var hitIndex : int = 0;
		var validHit : boolean = false;
		var hitDist : float = Mathf.Infinity;

		if (connected)
		{
			//Loop through raycast hits to find closest one
			for (var i : int = 0; i < wheelHits.Length; i++)
			{
				if (!wheelHits[i].transform.IsChildOf(vp.tr) && wheelHits[i].distance < hitDist)
				{
					hitIndex = i;
					hitDist = wheelHits[i].distance;
					validHit = true;
				}
			}
		}
		else
		{
			validHit = false;
		}

		//Set contact point variables
		if (validHit)
		{
			hit = wheelHits[hitIndex];
			
			if (!grounded && impactSnd && ((tireHitClips.Length > 0 && !popped) || (rimHitClip && popped)))
			{
				impactSnd.PlayOneShot(popped ? rimHitClip : tireHitClips[Mathf.RoundToInt(Random.Range(0, tireHitClips.Length - 1))], Mathf.Clamp01(airTime * airTime));
				impactSnd.pitch = Mathf.Clamp(airTime * 0.2f + 0.8f, 0.8f, 1);
			}

			grounded = true;
			contactPoint.distance = hit.distance - actualRadius;
			contactPoint.point = hit.point + localVel * Time.fixedDeltaTime;
			contactPoint.grounded = true;
			contactPoint.normal = hit.normal;
			contactPoint.relativeVelocity = tr.InverseTransformDirection(localVel);
			contactPoint.col = hit.collider;

			if (hit.collider.attachedRigidbody)
			{
				contactVelocity = hit.collider.attachedRigidbody.GetPointVelocity(contactPoint.point);
				contactPoint.relativeVelocity -= tr.InverseTransformDirection(contactVelocity);
			}
			else
			{
				contactVelocity = Vector3.zero;
			}

			var curSurface : GroundSurfaceInstance = hit.collider.GetComponent(GroundSurfaceInstance);
			var curTerrain : TerrainSurface = hit.collider.GetComponent(TerrainSurface);

			if (curSurface)
			{
				contactPoint.surfaceFriction = curSurface.friction;
				contactPoint.surfaceType = curSurface.surfaceType;
			}
			else if (curTerrain)
			{
				contactPoint.surfaceType = curTerrain.GetDominantSurfaceTypeAtPoint(contactPoint.point);
				contactPoint.surfaceFriction = curTerrain.GetFriction(contactPoint.surfaceType);
			}
			else
			{
				contactPoint.surfaceFriction = hit.collider.material.dynamicFriction * 2;
				contactPoint.surfaceType = 0;
			}

			if (contactPoint.col.CompareTag("Pop Tire") && canPop && airLeakTime == -1 && !popped)
			{
				Deflate();
			}
		}
		else
		{
			grounded = false;
			contactPoint.distance = suspensionParent.suspensionDistance;
			contactPoint.point = Vector3.zero;
			contactPoint.grounded = false;
			contactPoint.normal = upDir;
			contactPoint.relativeVelocity = Vector3.zero;
			contactPoint.col = null;
			contactVelocity = Vector3.zero;
			contactPoint.surfaceFriction = 0;
			contactPoint.surfaceType = 0;
		}
	}
	
	function GetRawRPM()
	{
		if (grounded)
		{
			rawRPM = (contactPoint.relativeVelocity.x / circumference) * (Mathf.PI * 100) * -suspensionParent.flippedSideFactor;
		}
		else
		{
			rawRPM = Mathf.Lerp(rawRPM, actualTargetRPM, (actualTorque + suspensionParent.brakeForce * vp.brakeInput + actualEbrake * vp.ebrakeInput) * Time.timeScale);
		}
	}
	
	function GetSlip()
	{
		if (grounded)
		{
			sidewaysSlip = (contactPoint.relativeVelocity.z * 0.1f) / sidewaysCurveStretch;
			forwardSlip = (0.01f * (rawRPM - currentRPM)) / forwardCurveStretch;
		}
		else
		{
			sidewaysSlip = 0;
			forwardSlip = 0;
		}
	}
	
	function ApplyFriction()
	{
		if (grounded)
		{
			var forwardSlipFactor : float = slipDependence == 0 || slipDependence == 1 ? forwardSlip - sidewaysSlip : forwardSlip;
			var sidewaysSlipFactor : float = slipDependence == 0 || slipDependence == 2 ? sidewaysSlip - forwardSlip : sidewaysSlip;
			var forwardSlipDependenceFactor : float = Mathf.Clamp01(forwardSlipDependence - Mathf.Clamp01(Mathf.Abs(sidewaysSlip)));
			var sidewaysSlipDependenceFactor : float = Mathf.Clamp01(sidewaysSlipDependence - Mathf.Clamp01(Mathf.Abs(forwardSlip)));

			frictionForce = Vector3.Lerp(frictionForce,
                    tr.TransformDirection(
					    forwardFrictionCurve.Evaluate(Mathf.Abs(forwardSlipFactor)) * -System.Math.Sign(forwardSlip) * (popped ? forwardRimFriction : forwardFriction) * forwardSlipDependenceFactor * -suspensionParent.flippedSideFactor
					    , 0
					    , sidewaysFrictionCurve.Evaluate(Mathf.Abs(sidewaysSlipFactor)) * -System.Math.Sign(sidewaysSlip) * (popped ? sidewaysRimFriction : sidewaysFriction) * sidewaysSlipDependenceFactor * normalFrictionCurve.Evaluate(Mathf.Clamp01(Vector3.Dot(contactPoint.normal, GlobalControl.worldUpDir))) * (vp.burnout > 0 && Mathf.Abs(targetDrive.rpm) != 0 && actualEbrake * vp.ebrakeInput == 0 && grounded ? (1 - vp.burnout) * (1 - Mathf.Abs(vp.accelInput)) : 1))
				    * (0.5f + (1 - suspensionParent.compression) * 0.5f * Mathf.Clamp01(Mathf.Abs(suspensionParent.tr.InverseTransformDirection(localVel).z) * 10)) * contactPoint.surfaceFriction
                , 1 - frictionSmoothness);

			rb.AddForceAtPosition(frictionForce, forceApplicationPoint, ForceMode.Acceleration);

			//If resting on a rigidbody, apply opposing force to it
			if (contactPoint.col.attachedRigidbody)
			{
				contactPoint.col.attachedRigidbody.AddForceAtPosition(-frictionForce, contactPoint.point, ForceMode.Acceleration);
			}
		}
	}
	
	function ApplyDrive()
	{
		var brakeForce : float = 0;
		var brakeCheckValue : float = suspensionParent.skidSteerBrake ? vp.localAngularVel.y : vp.localVelocity.z;

		//Set brake force
		if (vp.brakeIsReverse)
		{
			if (brakeCheckValue > 0)
			{
				brakeForce = suspensionParent.brakeForce * vp.brakeInput;
			}
			else if (brakeCheckValue <= 0)
			{
				brakeForce = suspensionParent.brakeForce * Mathf.Clamp01(vp.accelInput);
			}
		}
		else
		{
			brakeForce = suspensionParent.brakeForce * vp.brakeInput;
		}
		
		brakeForce += axleFriction * 0.1f * (Mathf.Approximately(actualTorque, 0) ? 1 : 0);

		if (targetDrive.rpm != 0)
		{
			brakeForce *= (1 - vp.burnout);
		}

		//Set final RPM
		if (!suspensionParent.jammed && connected)
		{
			var validTorque : boolean = (!(Mathf.Approximately(actualTorque, 0) && Mathf.Abs(actualTargetRPM) < 0.01f) && !Mathf.Approximately(actualTargetRPM, 0)) || brakeForce + actualEbrake * vp.ebrakeInput > 0;

			currentRPM = Mathf.Lerp(rawRPM, 
				Mathf.Lerp(
				Mathf.Lerp(rawRPM, actualTargetRPM, validTorque ? EvaluateTorque(actualTorque) : actualTorque)
				, 0, Mathf.Max(brakeForce, actualEbrake * vp.ebrakeInput))
			, validTorque ? EvaluateTorque(actualTorque + brakeForce + actualEbrake * vp.ebrakeInput) : actualTorque + brakeForce + actualEbrake * vp.ebrakeInput);

			targetDrive.feedbackRPM = Mathf.Lerp(currentRPM, rawRPM, feedbackRpmBias);
		}
		else
		{
		    currentRPM = 0;
		    targetDrive.feedbackRPM = 0;
		}
	}

	//Extra method for evaluating torque to make the ApplyDrive method more readable
	function EvaluateTorque(t : float) : float
	{
		var torque : float = Mathf.Lerp(rpmBiasCurve.Evaluate(t), t, rawRPM / (rpmBiasCurveLimit * Mathf.Sign(actualTargetRPM)));
		return torque;
	}
	
	function PositionWheel()
	{
		if (suspensionParent)
		{
			rim.position = suspensionParent.maxCompressPoint + suspensionParent.springDirection * suspensionParent.suspensionDistance * (Application.isPlaying ? travelDist : suspensionParent.targetCompression) +
				suspensionParent.upDir * Mathf.Pow(Mathf.Max(Mathf.Abs(Mathf.Sin(suspensionParent.sideAngle * Mathf.Deg2Rad)), Mathf.Abs(Mathf.Sin(suspensionParent.casterAngle * Mathf.Deg2Rad))), 2) * actualRadius +
				suspensionParent.pivotOffset * suspensionParent.tr.TransformDirection(Mathf.Sin(tr.localEulerAngles.y * Mathf.Deg2Rad), 0, Mathf.Cos(tr.localEulerAngles.y * Mathf.Deg2Rad))
				- suspensionParent.pivotOffset * (Application.isPlaying ? suspensionParent.forwardDir : suspensionParent.tr.forward);
		}

		if (Application.isPlaying && generateHardCollider && connected)
		{
			sphereColTr.position = rim.position;
		}
	}
	
	function RotateWheel()
	{
		if (tr && suspensionParent)
		{
			var ackermannVal : float = Mathf.Sign(suspensionParent.steerAngle) == suspensionParent.flippedSideFactor ? 1 + suspensionParent.ackermannFactor : 1 - suspensionParent.ackermannFactor;
			tr.localEulerAngles = new Vector3(suspensionParent.camberAngle + suspensionParent.casterAngle * suspensionParent.steerAngle * suspensionParent.flippedSideFactor, -suspensionParent.toeAngle * suspensionParent.flippedSideFactor + suspensionParent.steerDegrees * ackermannVal, 0);
		}

		if (Application.isPlaying)
		{
			rim.Rotate(Vector3.forward, currentRPM * suspensionParent.flippedSideFactor * Time.deltaTime);
			
			if (damage > 0)
			{
				rim.localEulerAngles = new Vector3(Mathf.Sin(-rim.localEulerAngles.z * Mathf.Deg2Rad) * Mathf.Clamp(damage, 0, 10), Mathf.Cos(-rim.localEulerAngles.z * Mathf.Deg2Rad) * Mathf.Clamp(damage, 0, 10), rim.localEulerAngles.z);
			}
			else if (rim.localEulerAngles.x != 0 || rim.localEulerAngles.y != 0)
			{
				rim.localEulerAngles = new Vector3(0, 0, rim.localEulerAngles.z);
			}
		}
	}
	
	public function Deflate()
	{
		airLeakTime = 0;
		
		if (impactSnd && tireAirClip)
		{
			impactSnd.PlayOneShot(tireAirClip);
			impactSnd.pitch = 1;
		}
	}

	public function FixTire()
	{
		popped = false;
		tirePressure = initialTirePressure;
		airLeakTime = -1;
	}

	public function Detach()
	{
		if (connected && canDetach)
		{
			connected = false;
			detachedWheel.SetActive(true);
			detachedWheel.transform.position = rim.position;
			detachedWheel.transform.rotation = rim.rotation;
			detachedCol.sharedMaterial = popped ? detachedRimMaterial : detachedTireMaterial;

			if (tire)
			{
				detachedTire.SetActive(!popped);
				detachedCol.sharedMesh = airLeakTime >= 0 || popped ? (rimMeshLoose ? rimMeshLoose : detachFilter.sharedMesh) : (tireMeshLoose ? tireMeshLoose : detachTireFilter.sharedMesh);
			}
			else
			{
				detachedCol.sharedMesh = rimMeshLoose ? rimMeshLoose : detachFilter.sharedMesh;
			}
			
			rb.mass -= mass;
			detachedBody.velocity = rb.GetPointVelocity(rim.position);
			detachedBody.angularVelocity = rb.angularVelocity;

			rim.gameObject.SetActive(false);
			
			if (sphereColTr)
			{
				sphereColTr.gameObject.SetActive(false);
			}
		}
	}

	//Automatically sets wheel dimensions based on rim/tire meshes
	public function GetWheelDimensions(radiusMargin : float, widthMargin : float)
	{
		var rimMesh : Mesh = null;
		var tireMesh : Mesh = null;
		var checker : Mesh;
		var scaler : Transform = transform;

		if (transform.childCount > 0)
		{
			if (transform.GetChild(0).GetComponent(MeshFilter))
			{
				rimMesh = transform.GetChild(0).GetComponent(MeshFilter).sharedMesh;
				scaler = transform.GetChild(0);
			}

			if (transform.GetChild(0).childCount > 0)
			{
				if (transform.GetChild(0).GetChild(0).GetComponent(MeshFilter))
				{
					tireMesh = transform.GetChild(0).GetChild(0).GetComponent(MeshFilter).sharedMesh;
				}
			}

			checker = tireMesh ? tireMesh : rimMesh;

			if (checker)
			{
				var maxWidth : float = 0;
				var maxRadius : float = 0;

				for (var curVert : Vector3 in checker.vertices)
				{
					if (new Vector2(curVert.x * scaler.localScale.x, curVert.y * scaler.localScale.y).magnitude > maxRadius)
					{
						maxRadius = new Vector2(curVert.x * scaler.localScale.x, curVert.y * scaler.localScale.y).magnitude;
					}

					if (Mathf.Abs(curVert.z * scaler.localScale.z) > maxWidth)
					{
						maxWidth = Mathf.Abs(curVert.z * scaler.localScale.z);
					}
				}

				tireRadius = maxRadius + radiusMargin;
				tireWidth = maxWidth + widthMargin;

				if (tireMesh && rimMesh)
				{
					maxWidth = 0;
					maxRadius = 0;

					for (var curVert : Vector3 in rimMesh.vertices)
					{
						if (new Vector2(curVert.x * scaler.localScale.x, curVert.y * scaler.localScale.y).magnitude > maxRadius)
						{
							maxRadius = new Vector2(curVert.x * scaler.localScale.x, curVert.y * scaler.localScale.y).magnitude;
						}
						
						if (Mathf.Abs(curVert.z * scaler.localScale.z) > maxWidth)
						{
							maxWidth = Mathf.Abs(curVert.z * scaler.localScale.z);
						}
					}

					rimRadius = maxRadius + radiusMargin;
					rimWidth = maxWidth + widthMargin;
				}
				else
				{
					rimRadius = maxRadius * 0.5f + radiusMargin;
					rimWidth = maxWidth * 0.5f + widthMargin;
				}
			}
			else
			{
				Debug.LogError("No rim or tire meshes found for getting wheel dimensions.", this);
			}
		}
	}

	public function Reattach()
	{
		if (!connected)
		{
			connected = true;
			detachedWheel.SetActive(false);
			rb.mass += mass;
			rim.gameObject.SetActive(true);
			
			if (sphereColTr)
			{
				sphereColTr.gameObject.SetActive(true);
			}
		}
	}

	//visualize wheel
	function OnDrawGizmosSelected()
	{
		tr = transform;

		if (tr.childCount > 0)
		{
			rim = tr.GetChild(0);

			if (rim.childCount > 0)
			{
				tire = rim.GetChild(0);
			}
		}

		var tireActualRadius : float = Mathf.Lerp(rimRadius, tireRadius, tirePressure);

		if (tirePressure < 1 && tirePressure > 0)
		{
			Gizmos.color = new Color(1, 1, 0, popped ? 0.5f : 1);
			GizmosExtra.DrawWireCylinder(rim.position, rim.forward, tireActualRadius, tireWidth * 2);
		}

		Gizmos.color = Color.white;
		GizmosExtra.DrawWireCylinder(rim.position, rim.forward, tireRadius, tireWidth * 2);

		Gizmos.color = tirePressure == 0 || popped ? Color.green : Color.cyan;
		GizmosExtra.DrawWireCylinder(rim.position, rim.forward, rimRadius, rimWidth * 2);

		Gizmos.color = new Color(1, 1, 1, tirePressure < 1 ? 0.5f : 1);
		GizmosExtra.DrawWireCylinder(rim.position, rim.forward, tireRadius, tireWidth * 2);

		Gizmos.color = tirePressure == 0 || popped ? Color.green : Color.cyan;
		GizmosExtra.DrawWireCylinder(rim.position, rim.forward, rimRadius, rimWidth * 2);
	}
	
	//Destroy detached wheel
	function OnDestroy()
	{
		if (Application.isPlaying)
		{
			if (detachedWheel)
			{
				Destroy(detachedWheel);
			}
		}
	}
}


//Contact point class
public class WheelContact
{
	 var grounded : boolean;//Is the contact point grounded?
	 var col : Collider;//The collider of the contact point
	 var point : Vector3;//The position of the contact point
	 var normal : Vector3;//The normal of the contact point
	 var relativeVelocity : Vector3;//Relative velocity between the wheel and the contact point object
	 var distance : float;//Distance from the suspension to the contact point minus the wheel radius
	 var surfaceFriction : float;//Friction of the contact surface
	 var surfaceType : int;//The surface type identified by the surface types array of GroundSurfaceMaster
}