#pragma strict
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Hover/Hover Motor", 0)

//Motor subclass for hovering vehicles
public class HoverMotor extends Motor
{
	@Header("Performance")
	
	@Tooltip("Curve which calculates the driving force based on the speed of the vehicle, x-axis = speed, y-axis = force")
	var forceCurve : AnimationCurve = AnimationCurve.EaseInOut(0, 1, 50, 0);
	var wheels : HoverWheel[];

	public function FixedUpdate()
	{
		super.FixedUpdate();

		//Get proper input
		var actualAccel : float = vp.brakeIsReverse ? vp.accelInput - vp.brakeInput : vp.accelInput;
		actualInput = inputCurve.Evaluate(Mathf.Abs(actualAccel)) * Mathf.Sign(actualAccel);

		//Set hover wheel speeds and forces
		for (var curWheel : HoverWheel in wheels)
		{
			if (ignition)
		    {
                var boostEval : float = boostPowerCurve.Evaluate(Mathf.Abs(vp.localVelocity.z));
                curWheel.targetSpeed = actualInput * forceCurve.keys[forceCurve.keys.Length - 1].time * (boosting ? 1 + boostEval : 1);
				curWheel.targetForce = Mathf.Abs(actualInput) * forceCurve.Evaluate(Mathf.Abs(vp.localVelocity.z) - (boosting ? boostEval : 0)) * power * (boosting ? 1 + boostEval : 1) * health;
		    }
			else
			{
				curWheel.targetSpeed = 0;
				curWheel.targetForce = 0;
			}

			curWheel.doFloat = ignition && health > 0;
		}
	}

	public function Update()
	{
		//Set engine pitch
		if (snd && ignition)
		{
			targetPitch = Mathf.Max(Mathf.Abs(actualInput), Mathf.Abs(vp.steerInput) * 0.5f) * (1 - forceCurve.Evaluate(Mathf.Abs(vp.localVelocity.z)));
		}

		super.Update();
	}
}
