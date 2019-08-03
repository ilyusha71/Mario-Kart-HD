#pragma strict
@AddComponentMenu("RVP/JS/Drivetrain/Drive Force", 3)

//The class for RPMs and torque sent through the drivetrain
public class DriveForce extends MonoBehaviour
{
	@System.NonSerialized
	var rpm : float;
	@System.NonSerialized
	var torque : float;
	@System.NonSerialized
	var curve : AnimationCurve;//Torque curve
	@System.NonSerialized
	var feedbackRPM : float;//RPM sent back through the drivetrain
	@System.NonSerialized
	var active : boolean = true;

	public function SetDrive(from : DriveForce)
	{
		rpm = from.rpm;
		torque = from.torque;
		curve = from.curve;
	}

	//Same as previous, but with torqueFactor multiplier for torque
	public function SetDrive(from : DriveForce, torqueFactor : float)
	{
		rpm = from.rpm;
		torque = from.torque * torqueFactor;
		curve = from.curve;
	}
}