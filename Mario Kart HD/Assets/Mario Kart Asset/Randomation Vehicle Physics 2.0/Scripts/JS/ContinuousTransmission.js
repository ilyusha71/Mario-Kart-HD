#pragma strict
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Drivetrain/Transmission/Continuous Transmission", 1)

//Transmission subclass for continuously variable transmission
public class ContinuousTransmission extends Transmission
{
	@Tooltip("Lerp value between min ratio and max ratio")
	@RangeAttribute(0,1)
	var targetRatio : float;
	var minRatio : float;
	var maxRatio : float;
	@System.NonSerialized
	var currentRatio : float;
	var canReverse : boolean;
	@System.NonSerialized
	var reversing : boolean;

	@Tooltip("How quickly the target ratio changes with manual shifting")
	public var manualShiftRate : float = 0.5f;

	function FixedUpdate()
	{
		health = Mathf.Clamp01(health);	
	
		//Set max RPM possible
		if (maxRPM == -1)
		{
			maxRPM = targetDrive.curve.keys[targetDrive.curve.length - 1].time * 1000;
		}

		if (health > 0)
		{
			if (automatic && vp.groundedWheels > 0)
			{
				//Automatically set the target ratio
				targetRatio = (1 - vp.burnout) * Mathf.Clamp01(Mathf.Abs(targetDrive.feedbackRPM) / Mathf.Max(0.01f, maxRPM * Mathf.Abs(currentRatio)));
			}
			else if (!automatic)
			{
				//Manually set the target ratio
				targetRatio = Mathf.Clamp01(targetRatio + (vp.upshiftHold - vp.downshiftHold) * manualShiftRate * Time.deltaTime);
			}
		}

		reversing = canReverse && vp.burnout == 0 && vp.localVelocity.z < 1 && (vp.accelInput < 0 || (vp.brakeIsReverse && vp.brakeInput > 0));
		currentRatio = Mathf.Lerp(minRatio, maxRatio, targetRatio) * (reversing ? -1 : 1);

		newDrive.curve = targetDrive.curve;
		newDrive.rpm = targetDrive.rpm / currentRatio;
		newDrive.torque = Mathf.Abs(currentRatio) * targetDrive.torque;
		SetOutputDrives(currentRatio);
	}
}