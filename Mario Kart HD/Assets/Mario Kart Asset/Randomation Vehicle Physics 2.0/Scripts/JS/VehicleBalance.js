#pragma strict
@script RequireComponent(VehicleParent)
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Vehicle Controllers/Vehicle Balance", 4)

//Class for balancing vehicles
public class VehicleBalance extends MonoBehaviour
{
	private var tr : Transform;
	private var rb : Rigidbody;
	private var vp : VehicleParent;

	private var actualPitchInput : float;
	private var targetLean : Vector3;
	private var targetLeanActual : Vector3;

	@Tooltip("Lean strength along each axis")
	var leanFactor : Vector3;

	@RangeAttribute(0,0.99f)
	var leanSmoothness : float;

	@Tooltip("Adjusts the roll based on the speed, x-axis = speed, y-axis = roll amount")
	var leanRollCurve : AnimationCurve = AnimationCurve.Linear(0, 0, 10, 1);

	@Tooltip("Adjusts the pitch based on the speed, x-axis = speed, y-axis = pitch amount")
	var leanPitchCurve : AnimationCurve = AnimationCurve.Linear(0, 0, 1, 1);

	@Tooltip("Adjusts the yaw based on the speed, x-axis = speed, y-axis = yaw amount")
	var leanYawCurve : AnimationCurve = AnimationCurve.Linear(0, 0, 1, 1);

	@Tooltip("Speed above which endos (forward wheelies) aren't allowed")
	var endoSpeedThreshold : float;

	@Tooltip("Exponent for pitch input")
	var pitchExponent : float;

	@Tooltip("How much to lean when sliding sideways")
	var slideLeanFactor : float = 1;

	function Start()
	{
		tr = transform;
		rb = GetComponent(Rigidbody);
		vp = GetComponent(VehicleParent);
	}

	function FixedUpdate()
	{
		//Apply endo limit
		actualPitchInput = vp.wheels.Length == 1 ? 0 : Mathf.Clamp(vp.pitchInput, -1, vp.velMag > endoSpeedThreshold ? 0 : 1);

		if (vp.groundedWheels > 0)
		{
			if (leanFactor != Vector3.zero)
			{
				ApplyLean();
			}
		}
	}

	function ApplyLean()
	{
		if (vp.groundedWheels > 0)
		{
			var inverseWorldUp : Vector3;
			inverseWorldUp = vp.norm.InverseTransformDirection(Vector3.Dot(vp.wheelNormalAverage, GlobalControl.worldUpDir) <= 0 ? vp.wheelNormalAverage : Vector3.Lerp(GlobalControl.worldUpDir, vp.wheelNormalAverage, Mathf.Abs(Vector3.Dot(vp.norm.up, GlobalControl.worldUpDir)) * 2));
			Debug.DrawRay(tr.position, vp.norm.TransformDirection(inverseWorldUp), Color.white);

			//Calculate target lean direction
			targetLean = new Vector3(
				Mathf.Lerp(inverseWorldUp.x, Mathf.Clamp(-vp.rollInput * leanFactor.z * leanRollCurve.Evaluate(Mathf.Abs(vp.localVelocity.z)) + Mathf.Clamp(vp.localVelocity.x * slideLeanFactor, -leanFactor.z * slideLeanFactor, leanFactor.z * slideLeanFactor), -leanFactor.z, leanFactor.z), Mathf.Max(Mathf.Abs(F.MaxAbs(vp.steerInput, vp.rollInput)))),
				Mathf.Pow(Mathf.Abs(actualPitchInput), pitchExponent) * Mathf.Sign(actualPitchInput) * leanFactor.x,
				inverseWorldUp.z * (1 - Mathf.Abs(F.MaxAbs(actualPitchInput * leanFactor.x, vp.rollInput * leanFactor.z))));
		}
		else
		{
			targetLean = vp.upDir;
		}

		//Transform targetLean to world space
		targetLeanActual = Vector3.Lerp(targetLeanActual, vp.norm.TransformDirection(targetLean), (1 - leanSmoothness) * Time.timeScale * TimeMaster.inverseFixedTimeFactor).normalized;
		Debug.DrawRay(tr.position, targetLeanActual, Color.black);

		//Apply pitch
		rb.AddTorque(
			vp.norm.right * -(Vector3.Dot(vp.forwardDir,targetLeanActual) * 20 - vp.localAngularVel.x) * 100 * (vp.wheels.Length == 1 ? 1 : leanPitchCurve.Evaluate(Mathf.Abs(actualPitchInput)))
			, ForceMode.Acceleration);

		//Apply yaw
		rb.AddTorque(
			vp.norm.forward * (vp.groundedWheels == 1 ? vp.steerInput * leanFactor.y - vp.norm.InverseTransformDirection(rb.angularVelocity).z : 0) * 100 * leanYawCurve.Evaluate(Mathf.Abs(vp.steerInput))
			, ForceMode.Acceleration);

		//Apply roll
		rb.AddTorque(
			vp.norm.up * (-Vector3.Dot(vp.rightDir, targetLeanActual) * 20 - vp.localAngularVel.z) * 100
			, ForceMode.Acceleration);

		//Turn vehicle during wheelies
		if (vp.groundedWheels == 1 && leanFactor.y > 0)
		{
			rb.AddTorque(vp.norm.TransformDirection(new Vector3(
				0,
				0,
				vp.steerInput * leanFactor.y - vp.norm.InverseTransformDirection(rb.angularVelocity).z
				)), ForceMode.Acceleration);
		}
	}
}