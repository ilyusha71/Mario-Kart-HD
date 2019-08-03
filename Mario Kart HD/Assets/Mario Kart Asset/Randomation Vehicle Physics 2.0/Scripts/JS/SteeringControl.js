#pragma strict
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Vehicle Controllers/Steering Control", 2)

//Class for steering vehicles
public class SteeringControl extends MonoBehaviour
{
	private var tr : Transform;
	private var vp : VehicleParent;
	var steerRate : float = 0.1f;
	private var steerAmount : float;

	@Tooltip("Curve for limiting steer range based on speed, x-axis = speed, y-axis = multiplier")
	var steerCurve : AnimationCurve = AnimationCurve.Linear(0, 1, 30, 0.1f);
	var limitSteer : boolean = true;

	@Tooltip("Horizontal stretch of the steer curve")
	var steerCurveStretch : float = 1;
	var applyInReverse : boolean = true;//Limit steering in reverse?
	var steeredWheels : Suspension[];
	
	@Header("Visual")

	var rotate : boolean;
	var maxDegreesRotation : float;
	var rotationOffset : float;
	private var steerRot : float;

	function Start()
	{
		tr = transform;
		vp = F.GetTopmostParentComponent(VehicleParent, tr) as VehicleParent;
		steerRot = rotationOffset;
	}
	
	function FixedUpdate()
	{
		var rbSpeed : float = vp.localVelocity.z / steerCurveStretch;
		var steerLimit : float = limitSteer ? steerCurve.Evaluate(applyInReverse ? Mathf.Abs(rbSpeed) : rbSpeed) : 1;
		steerAmount = vp.steerInput * steerLimit;

		//Set steer angles in wheels
		for (var curSus : Suspension in steeredWheels)
		{
			curSus.steerAngle = Mathf.Lerp(curSus.steerAngle, steerAmount * curSus.steerFactor * (curSus.steerEnabled ? 1 : 0) * (curSus.steerInverted ? -1 : 1), steerRate * TimeMaster.inverseFixedTimeFactor * Time.timeScale);
		}
	}
	
	function Update()
	{
		if (rotate)
		{
			steerRot = Mathf.Lerp(steerRot, steerAmount * maxDegreesRotation + rotationOffset, steerRate * Time.timeScale);
			tr.localEulerAngles = new Vector3(tr.localEulerAngles.x, tr.localEulerAngles.y, steerRot);
		}
	}
}
