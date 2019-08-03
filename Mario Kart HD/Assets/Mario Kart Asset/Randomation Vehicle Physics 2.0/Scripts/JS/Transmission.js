#pragma strict
@script RequireComponent(DriveForce)

//Class for transmissions
public class Transmission extends MonoBehaviour
{
	@RangeAttribute(0, 1)
	var strength : float = 1;
	@System.NonSerialized
	var health : float = 1;
	protected var vp : VehicleParent;
	protected var targetDrive : DriveForce;
	protected var newDrive : DriveForce;
	var automatic : boolean;

	@Tooltip("Apply special drive to wheels for skid steering")
	var skidSteerDrive : boolean;
	
	var outputDrives : DriveForce[];

	@Tooltip("Exponent for torque output on each wheel")
	var driveDividePower : float = 3;
	
	@System.NonSerialized
	var maxRPM : float = -1;
	
	public function Start()
	{
		vp = F.GetTopmostParentComponent(VehicleParent, transform) as VehicleParent;
		targetDrive = GetComponent(DriveForce);
		newDrive = gameObject.AddComponent(DriveForce);
	}

	protected function SetOutputDrives(ratio : float)
	{
		//Distribute drive to wheels
		if (outputDrives.Length > 0)
		{
			var enabledDrives : int = 0;

			//Check for which outputs are enabled
			for (var curOutput : DriveForce in outputDrives)
			{
				if (curOutput.active)
				{
					enabledDrives ++;
				}
			}

			var torqueFactor : float = Mathf.Pow(1f / enabledDrives, driveDividePower);
			var tempRPM : float = 0;

			for (var curOutput : DriveForce in outputDrives)
			{
				if (curOutput.active)
				{
					tempRPM += skidSteerDrive ? Mathf.Abs(curOutput.feedbackRPM) : curOutput.feedbackRPM;
					curOutput.SetDrive(newDrive, torqueFactor);
				}
			}

			targetDrive.feedbackRPM = (tempRPM / enabledDrives) * ratio;
		}
	}
	
	public function ResetMaxRPM()
	{
		maxRPM = -1;//Setting this to -1 triggers subclasses to recalculate things
	}
}
