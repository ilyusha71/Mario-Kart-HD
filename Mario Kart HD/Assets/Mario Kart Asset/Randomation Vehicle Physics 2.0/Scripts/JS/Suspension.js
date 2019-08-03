#pragma strict
import System.Collections.Generic;
@RequireComponent(DriveForce)
@ExecuteInEditMode
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Suspension/Suspension", 0)

//Class for the suspensions
public class Suspension extends MonoBehaviour
{
	@System.NonSerialized
	var tr : Transform;
	private var rb : Rigidbody;
	private var vp : VehicleParent;

	//Variables for inverting certain values on opposite sides of the vehicle
	@System.NonSerialized
	var flippedSide : boolean;
	@System.NonSerialized
	var flippedSideFactor : float;
	@System.NonSerialized
	var initialRotation : Quaternion;
	
	var wheel : Wheel;
	private var compressCol : CapsuleCollider;//The hard collider

	@Tooltip("Generate a capsule collider for hard compressions")
	var generateHardCollider : boolean = true;

	@Tooltip("Multiplier for the radius of the hard collider")
	var hardColliderRadiusFactor : float = 1;
	private var hardColliderRadiusFactorPrev : float;
	private var setHardColliderRadiusFactor : float;
	private var compressTr : Transform;//Transform component of the hard collider

	@Header("Brakes and Steering")
	var brakeForce : float;
	var ebrakeForce : float;

	@RangeAttribute(-180, 180)
	var steerRangeMin : float;
	@RangeAttribute(-180, 180)
	var steerRangeMax : float;

	@Tooltip("How much the wheel is steered")
	var steerFactor : float = 1;
	@RangeAttribute(-1, 1)
	var steerAngle : float;
	@System.NonSerialized
	var steerDegrees : float;

	@Tooltip("Effect of Ackermann steering geometry")
	var ackermannFactor : float;

	@Tooltip("The camber of the wheel as it travels, x-axis = compression, y-axis = angle")
	var camberCurve : AnimationCurve = AnimationCurve.Linear(0, -10, 1, 10);
	@System.NonSerialized
	var camberAngle : float;

	@Tooltip("Adjust the camber as if it was connected to a solid axle, opposite wheel must be set")
	var solidAxleCamber : boolean;
	var oppositeWheel : Suspension;

	@Tooltip("Angle at which the suspension points out to the side")
	@RangeAttribute(-89.999f, 89.999f)
	var sideAngle : float;
	@RangeAttribute(-89.999f, 89.999f)
	var casterAngle : float;
	@RangeAttribute(-89.999f, 89.999f)
	var toeAngle : float;

	@Tooltip("Wheel offset from its pivot point")
	var pivotOffset : float;
	@System.NonSerialized
	var movingParts : List.<SuspensionPart> = new List.<SuspensionPart>();

	@Header("Spring")
	var suspensionDistance : float;
	@System.NonSerialized
	var compression : float;

	@Tooltip("Should be left at 1 unless testing suspension travel")
	@RangeAttribute(0, 1)
	var targetCompression : float;
	@System.NonSerialized
	var penetration : float;//How deep the ground is interesecting with the wheel's tire
	var springForce : float;

	@Tooltip("Force of the curve depending on it's compression, x-axis = compression, y-axis = force")
	var springForceCurve : AnimationCurve = AnimationCurve.Linear(0, 0, 1, 1);

	@Tooltip("Exponent for spring force based on compression")
	var springExponent : float = 1;
	var springDampening : float;

	@Tooltip("How quickly the suspension extends if it's not grounded")
	var extendSpeed : float = 20;

	@Tooltip("Apply forces to prevent the wheel from intersecting with the ground, not necessary if generating a hard collider")
	var applyHardContactForce : boolean = true;
	var hardContactForce : float = 50;
	var hardContactSensitivity : float = 2;
	
	@Tooltip("Apply suspension forces at ground point")
	var applyForceAtGroundContact : boolean = true;
	
	@Tooltip("Apply suspension forces along local up direction instead of ground normal")
	var leaningForce : boolean;

	@System.NonSerialized
	var maxCompressPoint : Vector3;//Position of the wheel when the suspension is compressed all the way
	@System.NonSerialized
	var springDirection : Vector3;
	@System.NonSerialized
	var upDir : Vector3;//Local up direction
	@System.NonSerialized
	var forwardDir : Vector3;//Local forward direction
	
	@System.NonSerialized
	var targetDrive : DriveForce;//The drive being passed into the wheel

	@System.NonSerialized
	var properties : SuspensionPropertyToggle;//Property toggler
	@System.NonSerialized
	var steerEnabled : boolean = true;
	@System.NonSerialized
	var steerInverted : boolean;
	@System.NonSerialized
	var driveEnabled : boolean = true;
	@System.NonSerialized
	var driveInverted : boolean;
	@System.NonSerialized
	var ebrakeEnabled : boolean = true;
	@System.NonSerialized
	var skidSteerBrake : boolean;
	
	@Header("Damage")

	@Tooltip("Point around which the suspension pivots when damaged")
	var damagePivot : Vector3;

	@Tooltip("Compression amount to remain at when wheel is detached")
	@RangeAttribute(0, 1)
	var detachedCompression : float = 0.5f;

	var jamForce : float = Mathf.Infinity;
	@System.NonSerialized
	var jammed : boolean;

	function Start()
	{
		tr = transform;
		rb = F.GetTopmostParentComponent(Rigidbody, tr) as Rigidbody;
		vp = F.GetTopmostParentComponent(VehicleParent, tr) as VehicleParent;
		targetDrive = GetComponent(DriveForce);
		flippedSide = Vector3.Dot(tr.forward, vp.transform.right) < 0;
		flippedSideFactor = flippedSide ? -1 : 1;
		initialRotation = tr.localRotation;

		if (Application.isPlaying)
		{
			GetCamber();

			//Generate the hard collider
			if (generateHardCollider)
			{
				var cap : GameObject = new GameObject("Compress Collider");
				cap.layer = GlobalControl.ignoreWheelCastLayer;
				compressTr = cap.transform;
				compressTr.parent = tr;
				compressTr.localPosition = Vector3.zero;
				compressTr.localEulerAngles = new Vector3(camberAngle, 0, -casterAngle * flippedSideFactor);
				compressCol = cap.AddComponent(CapsuleCollider);
				compressCol.direction = 1;
				setHardColliderRadiusFactor = hardColliderRadiusFactor;
				hardColliderRadiusFactorPrev = setHardColliderRadiusFactor;
				compressCol.radius = wheel.rimWidth * hardColliderRadiusFactor;
				compressCol.height = (wheel.popped ? wheel.rimRadius : Mathf.Lerp(wheel.rimRadius, wheel.tireRadius, wheel.tirePressure)) * 2;
				compressCol.material = GlobalControl.frictionlessMatStatic;
			}

			steerRangeMax = Mathf.Max(steerRangeMin, steerRangeMax);

			properties = GetComponent(SuspensionPropertyToggle);
			if (properties)
			{
				UpdateProperties();
			}
		}
	}

	function FixedUpdate()
	{
		upDir = tr.up;
		forwardDir = tr.forward;
		targetCompression = 1;

		GetCamber();

		GetSpringVectors();

		if (wheel.connected)
		{
			compression = Mathf.Min(targetCompression, suspensionDistance > 0 ? Mathf.Clamp01(wheel.contactPoint.distance / suspensionDistance) : 0);
			penetration = Mathf.Min(0, wheel.contactPoint.distance);
		}
		else
		{
			compression = detachedCompression;
			penetration = 0;
		}

		if (targetCompression > 0)
		{
			ApplySuspensionForce();
		}

		//Set hard collider size if it is changed during play mode
		if (generateHardCollider)
		{
			setHardColliderRadiusFactor = hardColliderRadiusFactor;

			if (hardColliderRadiusFactorPrev != setHardColliderRadiusFactor || wheel.updatedSize || wheel.updatedPopped)
			{
				if (wheel.rimWidth > wheel.actualRadius)
				{
					compressCol.direction = 2;
					compressCol.radius = wheel.actualRadius * hardColliderRadiusFactor;
					compressCol.height = wheel.rimWidth * 2;
				}
				else
				{
					compressCol.direction = 1;
					compressCol.radius = wheel.rimWidth * hardColliderRadiusFactor;
					compressCol.height = wheel.actualRadius * 2;
				}
			}

			hardColliderRadiusFactorPrev = setHardColliderRadiusFactor;
		}

		//Set the drive of the wheel
		if (wheel.connected)
		{
			if (wheel.targetDrive)
			{
				targetDrive.active = driveEnabled;
				targetDrive.feedbackRPM = wheel.targetDrive.feedbackRPM;
				wheel.targetDrive.SetDrive(targetDrive);
			}
		}
		else
		{
			targetDrive.feedbackRPM = targetDrive.rpm;
		}
	}

	function Update()
	{
		GetCamber();

		if (!Application.isPlaying)
		{
			GetSpringVectors();
		}

		//Set steer angle for the wheel
		steerDegrees = Mathf.Lerp(steerRangeMin, steerRangeMax, (steerAngle + 1) * 0.5f);
	}

	function ApplySuspensionForce()
	{
		if (wheel.grounded && wheel.connected)
		{
			//Get the local vertical velocity
			var travelVel : float = vp.norm.InverseTransformDirection(rb.GetPointVelocity(tr.position)).z;

			//Apply the suspension force
			if (suspensionDistance > 0 && targetCompression > 0)
			{
				var appliedSuspensionForce : Vector3 = (leaningForce ? Vector3.Lerp(upDir, vp.norm.forward, Mathf.Abs(Mathf.Pow(Vector3.Dot(vp.norm.forward, vp.upDir), 5))) : vp.norm.forward) * springForce * (Mathf.Pow(springForceCurve.Evaluate(1 - compression), Mathf.Max(1, springExponent)) - (1 - targetCompression) - springDampening * Mathf.Clamp(travelVel, -1, 1));

				rb.AddForceAtPosition(
					appliedSuspensionForce
					, applyForceAtGroundContact ? wheel.contactPoint.point : wheel.tr.position
					, ForceMode.Acceleration);

				//If wheel is resting on a rigidbody, apply opposing force to it
				if (wheel.contactPoint.col.attachedRigidbody)
				{
					wheel.contactPoint.col.attachedRigidbody.AddForceAtPosition(
						-appliedSuspensionForce
						, wheel.contactPoint.point
						, ForceMode.Acceleration);
				}
			}

			//Apply hard contact force
			if (compression == 0 && !generateHardCollider && applyHardContactForce)
			{
				rb.AddForceAtPosition(
					-vp.norm.TransformDirection(0, 0, Mathf.Clamp(travelVel, -hardContactSensitivity * TimeMaster.fixedTimeFactor, 0) + penetration) * hardContactForce * Mathf.Clamp01(TimeMaster.fixedTimeFactor)
					, applyForceAtGroundContact ? wheel.contactPoint.point : wheel.tr.position
					, ForceMode.Acceleration);
			}
		}
	}

	function GetSpringVectors()
	{
		if (!Application.isPlaying)
		{
			tr = transform;
			flippedSide = Vector3.Dot(tr.forward, vp.transform.right) < 0;
			flippedSideFactor = flippedSide ? -1 : 1;
		}

		maxCompressPoint = tr.position;

		var casterDir : float = -Mathf.Sin(casterAngle * Mathf.Deg2Rad) * flippedSideFactor;
		var sideDir : float = -Mathf.Sin(sideAngle * Mathf.Deg2Rad);

		springDirection = tr.TransformDirection(casterDir, Mathf.Max(Mathf.Abs(casterDir), Mathf.Abs(sideDir)) - 1, sideDir).normalized;
	}

	function GetCamber()
	{
		if (solidAxleCamber && oppositeWheel)
		{
			if (oppositeWheel.wheel.rim && wheel.rim)
			{
				var axleDir : Vector3 = tr.InverseTransformDirection((oppositeWheel.wheel.rim.position - wheel.rim.position).normalized);
				camberAngle = Mathf.Atan2(axleDir.z, axleDir.y) * Mathf.Rad2Deg + 90;
			}
		}
		else
		{
			camberAngle = camberCurve.Evaluate((Application.isPlaying ? wheel.travelDist : targetCompression));
		}
	}

	//Update the toggleable properties
	public function UpdateProperties()
	{
		if (properties)
		{
			for (var curProperty : SuspensionToggledProperty in properties.properties)
			{
				switch (curProperty.property)
				{
					case 0:
						steerEnabled = curProperty.toggled;
						break;
					case 1:
						steerInverted = curProperty.toggled;
						break;
					case 2:
						driveEnabled = curProperty.toggled;
						break;
					case 3:
						driveInverted = curProperty.toggled;
						break;
					case 4:
						ebrakeEnabled = curProperty.toggled;
						break;
					case 5:
						skidSteerBrake = curProperty.toggled;
						break;
				}
			}
		}
	}

	//Visualize steer range
	function OnDrawGizmosSelected()
	{
		if (!tr)
		{
			tr = transform;
		}

		if (wheel)
		{
			if (wheel.rim)
			{
				var wheelPoint : Vector3 = wheel.rim.position;

				var camberSin : float = -Mathf.Sin(camberAngle * Mathf.Deg2Rad);
				var steerSin : float = Mathf.Sin(Mathf.Lerp(steerRangeMin, steerRangeMax, (steerAngle + 1) * 0.5f) * Mathf.Deg2Rad);
				var minSteerSin : float = Mathf.Sin(steerRangeMin * Mathf.Deg2Rad);
				var maxSteerSin : float = Mathf.Sin(steerRangeMax * Mathf.Deg2Rad);

				Gizmos.color = Color.magenta;

				Gizmos.DrawWireSphere(wheelPoint, 0.05f);

				Gizmos.DrawLine(wheelPoint, wheelPoint + tr.TransformDirection(minSteerSin
					, camberSin * (1 - Mathf.Abs(minSteerSin))
				    , Mathf.Cos(steerRangeMin * Mathf.Deg2Rad) * (1 - Mathf.Abs(camberSin))
				    ).normalized);

				Gizmos.DrawLine(wheelPoint, wheelPoint + tr.TransformDirection(maxSteerSin
					, camberSin * (1 - Mathf.Abs(maxSteerSin))
					, Mathf.Cos(steerRangeMax * Mathf.Deg2Rad) * (1 - Mathf.Abs(camberSin))
					).normalized);

				Gizmos.DrawLine(wheelPoint + tr.TransformDirection(minSteerSin
					, camberSin * (1 - Mathf.Abs(minSteerSin))
					, Mathf.Cos(steerRangeMin * Mathf.Deg2Rad) * (1 - Mathf.Abs(camberSin))
					).normalized * 0.9f
				, wheelPoint + tr.TransformDirection(maxSteerSin
					, camberSin * (1 - Mathf.Abs(maxSteerSin))
				 	, Mathf.Cos(steerRangeMax * Mathf.Deg2Rad) * (1 - Mathf.Abs(camberSin))
					).normalized * 0.9f);

				Gizmos.DrawLine(wheelPoint, wheelPoint + tr.TransformDirection(steerSin
					, camberSin * (1 - Mathf.Abs(steerSin))
					, Mathf.Cos(steerRangeMin * Mathf.Deg2Rad) * (1 - Mathf.Abs(camberSin))
					).normalized);
			}
		}

		Gizmos.color = Color.red;

		Gizmos.DrawWireSphere(tr.TransformPoint(damagePivot), 0.05f);
	}
}
