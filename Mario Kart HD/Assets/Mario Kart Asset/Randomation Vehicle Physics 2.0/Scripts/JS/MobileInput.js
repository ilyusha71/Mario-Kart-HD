#pragma strict
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Input/Mobile Input Setter", 1)

//Class for setting mobile input
public class MobileInput extends MonoBehaviour
{
	//Orientation the screen is locked at
	var screenRot : ScreenOrientation = ScreenOrientation.LandscapeLeft;

	@System.NonSerialized
	var accel : float;
	@System.NonSerialized
	var brake : float;
	@System.NonSerialized
	var steer : float;
	@System.NonSerialized
	var ebrake : float;
	@System.NonSerialized
	var boost : boolean;

	//Set screen orientation
	function Start()
	{
		Screen.autorotateToPortrait = screenRot == ScreenOrientation.Portrait || screenRot == ScreenOrientation.AutoRotation;
		Screen.autorotateToPortraitUpsideDown = screenRot == ScreenOrientation.PortraitUpsideDown || screenRot == ScreenOrientation.AutoRotation;
		Screen.autorotateToLandscapeRight = screenRot == ScreenOrientation.LandscapeRight || screenRot == ScreenOrientation.Landscape || screenRot == ScreenOrientation.AutoRotation;
		Screen.autorotateToLandscapeLeft = screenRot == ScreenOrientation.LandscapeLeft || screenRot == ScreenOrientation.Landscape || screenRot == ScreenOrientation.AutoRotation;
		Screen.orientation = screenRot;
	}

	//Input setting functions that can be linked to buttons
	function SetAccel(f : float)
	{
		accel = Mathf.Clamp01(f);
	}

	function SetBrake(f : float)
	{
		brake = Mathf.Clamp01(f);
	}

	function SetSteer(f : float)
	{
		steer = Mathf.Clamp(f, -1, 1);
	}

	function SetEbrake(f : float)
	{
		ebrake = Mathf.Clamp01(f);
	}

	function SetBoost(b : boolean)
	{
		boost = b;
	}
}