#pragma strict
@script RequireComponent(VehicleParent)
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Vehicle Controllers/Vehicle Assist", 1)

//Class for assisting vehicle performance
public class VehicleAssist extends MonoBehaviour
{
	private var tr : Transform;
	private var rb : Rigidbody;
	private var vp : VehicleParent;

	@Header("Drift")

	@Tooltip("Variables are multiplied based on the number of wheels grounded out of the total number of wheels")
	var basedOnWheelsGrounded : boolean;
	private var groundedFactor : float;

	@Tooltip("How much to assist with spinning while drifting")
	var driftSpinAssist : float;
	var driftSpinSpeed : float;
	var driftSpinExponent : float = 1;
	
	@Tooltip("Automatically adjust drift angle based on steer input magnitude")
	var autoSteerDrift : boolean;
	var maxDriftAngle : float = 70;
	private var targetDriftAngle : float;

	@Tooltip("Adjusts the force based on drift speed, x-axis = speed, y-axis = force")
	var driftSpinCurve : AnimationCurve = AnimationCurve.Linear(0, 0, 10, 1);

	@Tooltip("How much to push the vehicle forward while drifting")
	var driftPush : float;
	
	@Tooltip("Straighten out the vehicle when sliding slightly")
	var straightenAssist : boolean;

	@Header("Downforce")
	var downforce : float = 1;
	var invertDownforceInReverse : boolean;
	var applyDownforceInAir : boolean;

	@Tooltip("X-axis = speed, y-axis = force")
	var downforceCurve : AnimationCurve = AnimationCurve.Linear(0, 0, 20, 1);

	@Header("Roll Over")

	@Tooltip("Automatically roll over when rolled over")
	var autoRollOver : boolean;

	@Tooltip("Roll over with steer input")
	var steerRollOver : boolean;
	
	@System.NonSerialized
	var rolledOver : boolean;

	@Tooltip("Distance to check on sides to see if rolled over")
	var rollCheckDistance : float = 1;
	var rollOverForce : float = 1;

	@Tooltip("Maximum speed at which vehicle can be rolled over with assists")
	var rollSpeedThreshold : float;

	@Header("Air")

	@Tooltip("Increase angular drag immediately after jumping")
	var angularDragOnJump : boolean;
	private var initialAngularDrag : float;
	private var angDragTime : float = 0;
	
	var fallSpeedLimit : float = Mathf.Infinity;
	var applyFallLimitUpwards : boolean;
	
	function Start()
	{
		tr = transform;
		rb = GetComponent(Rigidbody);
		vp = GetComponent(VehicleParent);
		initialAngularDrag = rb.angularDrag;
	}

	function FixedUpdate()
	{
		if (vp.groundedWheels > 0)
		{
			groundedFactor = basedOnWheelsGrounded ? vp.groundedWheels / (vp.hover ? vp.hoverWheels.Length : vp.wheels.Length) : 1;

			angDragTime = 20;
			rb.angularDrag = initialAngularDrag;

			if (driftSpinAssist > 0)
			{
				ApplySpinAssist();
			}

			if (driftPush > 0)
			{
				ApplyDriftPush();
			}
		}
		else
		{
			if (angularDragOnJump)
			{
				angDragTime = Mathf.Max(0, angDragTime - Time.timeScale * TimeMaster.inverseFixedTimeFactor);
				rb.angularDrag = angDragTime > 0 && vp.upDot > 0.5 ? 10 : initialAngularDrag;
			}
		}

		if (downforce > 0)
		{
			ApplyDownforce();
		}

		if (autoRollOver || steerRollOver)
		{
			RollOver();
		}
		
		if (Mathf.Abs(vp.localVelocity.y) > fallSpeedLimit && (vp.localVelocity.y < 0 || applyFallLimitUpwards))
		{
			rb.AddRelativeForce(Vector3.down * vp.localVelocity.y, ForceMode.Acceleration);
		}
	}

	function ApplySpinAssist()
	{
		//Get desired rotation speed
		var targetTurnSpeed : float = vp.steerInput * driftSpinSpeed * (vp.localVelocity.z < 0 ? (vp.accelAxisIsBrake ? Mathf.Sign(vp.accelInput) : Mathf.Sign(F.MaxAbs(vp.accelInput, -vp.brakeInput))) : 1);

		//Auto steer drift
		if (autoSteerDrift)
		{
			var steerSign : int = 0;
			if (vp.steerInput != 0)
			{
				steerSign = Mathf.Sign(vp.steerInput);
			}

			targetDriftAngle = (steerSign != Mathf.Sign(vp.localVelocity.x) ? vp.steerInput : steerSign) * -maxDriftAngle;
			var velDir : Vector3 = new Vector3(vp.localVelocity.x, 0, vp.localVelocity.z).normalized;
			var targetDir : Vector3 = new Vector3(Mathf.Sin(targetDriftAngle * Mathf.Deg2Rad), 0, Mathf.Cos(targetDriftAngle * Mathf.Deg2Rad)).normalized;
			var driftTorqueTemp : Vector3 = velDir - targetDir;
			targetTurnSpeed = driftTorqueTemp.magnitude * Mathf.Sign(driftTorqueTemp.z) * steerSign * driftSpinSpeed - vp.localAngularVel.y * Mathf.Clamp01(Vector3.Dot(velDir, targetDir)) * 2;
		}
		else
		{
			targetTurnSpeed = vp.steerInput * driftSpinSpeed * (vp.localVelocity.z < 0 ? (vp.accelAxisIsBrake ? Mathf.Sign(vp.accelInput) : Mathf.Sign(F.MaxAbs(vp.accelInput, -vp.brakeInput))) : 1);
		}

		rb.AddRelativeTorque(new Vector3(0,
			(targetTurnSpeed - vp.localAngularVel.y) * driftSpinAssist * driftSpinCurve.Evaluate(Mathf.Abs(Mathf.Pow(vp.localVelocity.x, driftSpinExponent))) * groundedFactor
			, 0), ForceMode.Acceleration);

		var rightVelDot : float = Vector3.Dot(tr.right, rb.velocity.normalized);

		if (straightenAssist && vp.steerInput == 0 && Mathf.Abs(rightVelDot) < 0.1f && vp.sqrVelMag > 5)
		{
			rb.AddRelativeTorque(new Vector3(0,
				rightVelDot * 100 * Mathf.Sign(vp.localVelocity.z) * driftSpinAssist
				, 0), ForceMode.Acceleration);
		}
	}

	function ApplyDownforce()
	{
		if (vp.groundedWheels > 0 || applyDownforceInAir)
		{
			rb.AddRelativeForce(new Vector3(0,
				downforceCurve.Evaluate(Mathf.Abs(vp.localVelocity.z)) * -downforce * (applyDownforceInAir ? 1 : groundedFactor) * (invertDownforceInReverse ? Mathf.Sign(vp.localVelocity.z) : 1)
				, 0), ForceMode.Acceleration);

			//Reverse downforce
			if (invertDownforceInReverse && vp.localVelocity.z < 0)
			{
				rb.AddRelativeTorque(new Vector3(
					downforceCurve.Evaluate(Mathf.Abs(vp.localVelocity.z)) * downforce * (applyDownforceInAir ? 1 : groundedFactor)
					, 0, 0), ForceMode.Acceleration);
			}
		}
	}

	function RollOver()
	{
		var rollHit : RaycastHit;

		//Check if rolled over
		if (vp.groundedWheels == 0 && vp.velMag < rollSpeedThreshold && vp.upDot < 0.8 && rollCheckDistance > 0)
		{
			if (Physics.Raycast(tr.position, vp.upDir, rollHit, rollCheckDistance, GlobalControl.groundMaskStatic) || Physics.Raycast(tr.position, vp.rightDir, rollHit, rollCheckDistance, GlobalControl.groundMaskStatic) || Physics.Raycast(tr.position, -vp.rightDir, rollHit, rollCheckDistance, GlobalControl.groundMaskStatic))
			{
				rolledOver = true;
			}
			else
			{
				rolledOver = false;
			}
		}
		else
		{
			rolledOver = false;
		}

		//Apply roll over force
		if (rolledOver)
		{
			if (steerRollOver && vp.steerInput != 0)
			{
				rb.AddRelativeTorque(new Vector3(0, 0,
					-vp.steerInput * rollOverForce
					), ForceMode.Acceleration);
			}
			else if (autoRollOver)
			{
				rb.AddRelativeTorque(new Vector3(0, 0,
					-Mathf.Sign(vp.rightDot) * rollOverForce
					), ForceMode.Acceleration);
			}
		}
	}

	function ApplyDriftPush()
	{
		var pushFactor : float = (vp.accelAxisIsBrake ? vp.accelInput : vp.accelInput - vp.brakeInput) * Mathf.Abs(vp.localVelocity.x) * driftPush * groundedFactor * (1 - Mathf.Abs(Vector3.Dot(vp.forwardDir,rb.velocity.normalized)));

		rb.AddForce(vp.norm.TransformDirection(new Vector3(
			Mathf.Abs(pushFactor) * Mathf.Sign(vp.localVelocity.x),
			Mathf.Abs(pushFactor) * Mathf.Sign(vp.localVelocity.z),
			0)), ForceMode.Acceleration);
	}
}
