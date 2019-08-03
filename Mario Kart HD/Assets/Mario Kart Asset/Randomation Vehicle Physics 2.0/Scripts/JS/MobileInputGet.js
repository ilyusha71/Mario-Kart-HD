#pragma strict
@script RequireComponent(VehicleParent)
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Input/Mobile Input Getter", 2)

//Class for getting mobile input
public class MobileInputGet extends MonoBehaviour
{
	private var vp : VehicleParent;
	private var setter : MobileInput;
	var steerFactor : float = 1;
	var flipFactor : float = 1;
	var useAccelerometer : boolean = true;
	
	@Tooltip("Multiplier for input addition based on rate of change of input")
	var deltaFactor : float = 10;
	private var accelerationPrev : Vector3;
	private var accelerationDelta : Vector3;

	function Start()
	{
		vp = GetComponent(VehicleParent);
		setter = FindObjectOfType(MobileInput);
	}

	function FixedUpdate()
	{
		if (setter)
		{
			accelerationDelta = Input.acceleration - accelerationPrev;
			accelerationPrev = Input.acceleration;
			vp.SetAccel(setter.accel);
			vp.SetBrake(setter.brake);
			vp.SetEbrake(setter.ebrake);
			vp.SetBoost(setter.boost);

			if (useAccelerometer)
			{
				vp.SetSteer((Input.acceleration.x + accelerationDelta.x * deltaFactor) * steerFactor);
				vp.SetYaw(Input.acceleration.x * flipFactor);
				vp.SetPitch(-Input.acceleration.z * flipFactor);
			}
			else
			{
				vp.SetSteer(setter.steer);
			}
		}
	}
}
