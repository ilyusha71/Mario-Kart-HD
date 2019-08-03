#pragma strict
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Camera/Basic Camera Input", 1)

//Class for setting the camera input with the input manager
public class BasicCameraInput extends MonoBehaviour
{
	private var cam : CameraControl;
	var xInputAxis : String;
	var yInputAxis : String;

	function Start()
	{
		//Get camera controller
		cam = GetComponent(CameraControl);
	}

	function FixedUpdate()
	{
		//Set camera rotation input if the input axes are valid
		if (cam && !String.IsNullOrEmpty(xInputAxis) && !String.IsNullOrEmpty(yInputAxis))
		{
			cam.SetInput(Input.GetAxis(xInputAxis), Input.GetAxis(yInputAxis));
		}
	}
}
