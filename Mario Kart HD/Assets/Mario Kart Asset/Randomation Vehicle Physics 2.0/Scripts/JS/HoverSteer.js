#pragma strict
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Hover/Hover Steer", 2)

//Class for steering hover vehicles
public class HoverSteer extends MonoBehaviour
{
	private var tr : Transform;
	private var vp : VehicleParent;
	var steerRate : float = 1;
	private var steerAmount : float;

	@Tooltip("Curve for limiting steer range based on speed, x-axis = speed, y-axis = multiplier")
	var steerCurve : AnimationCurve = AnimationCurve.Linear(0, 1, 30, 0.1f);

	@Tooltip("Horizontal stretch of the steer curve")
	var steerCurveStretch : float = 1;
	var steeredWheels : HoverWheel[];
	
	@Header("Visual")
	
	var rotate : boolean;
	var maxDegreesRotation : float;
	var rotationOffset : float;
	private var steerRot :float;

	function Start()
	{
		tr = transform;
		vp = F.GetTopmostParentComponent(VehicleParent, tr) as VehicleParent;
	}
	
	function FixedUpdate()
	{
		//Set steering of hover wheels
		var rbSpeed : float = vp.localVelocity.z / steerCurveStretch;
		var steerLimit : float = steerCurve.Evaluate(Mathf.Abs(rbSpeed));
		steerAmount = vp.steerInput * steerLimit;
		
		for (var curWheel : HoverWheel in steeredWheels)
		{
			curWheel.steerRate = steerAmount * steerRate;
		}
	}
	
	function Update()
	{
		if (rotate)
		{
			steerRot = Mathf.Lerp(steerRot, steerAmount * maxDegreesRotation + rotationOffset, steerRate * 0.1f * Time.timeScale);
			tr.localEulerAngles = new Vector3(tr.localEulerAngles.x, tr.localEulerAngles.y, steerRot);
		}
	}
}
