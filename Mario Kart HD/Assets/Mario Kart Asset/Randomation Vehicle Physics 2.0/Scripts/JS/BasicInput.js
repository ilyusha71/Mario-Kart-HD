#pragma strict
@script RequireComponent(VehicleParent)
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Input/Basic Input", 0)

//Class for setting the input with the input manager
public class BasicInput extends MonoBehaviour
{
	private var vp : VehicleParent;
	var accelAxis : String;
	var brakeAxis : String;
	var steerAxis : String;
	var ebrakeAxis : String;
	var boostButton : String;
	var upshiftButton : String;
	var downshiftButton : String;
	var pitchAxis : String;
	var yawAxis : String;
	var rollAxis : String;

	function Start()
	{
		vp = GetComponent(VehicleParent);
	}

	function Update()
	{
		//Get single-frame input presses
		if (!String.IsNullOrEmpty(upshiftButton))
		{
			if (Input.GetButtonDown(upshiftButton))
			{
				vp.PressUpshift();
			}
		}
	
		if (!String.IsNullOrEmpty(downshiftButton))
		{
			if (Input.GetButtonDown(downshiftButton))
			{
				vp.PressDownshift();
			}
		}
	}

	function FixedUpdate()
	{
		//Get constant inputs
		if (!String.IsNullOrEmpty(accelAxis))
		{
			vp.SetAccel(Input.GetAxis(accelAxis));
		}

		if (!String.IsNullOrEmpty(brakeAxis))
		{
			vp.SetBrake(Input.GetAxis(brakeAxis));
		}

		if (!String.IsNullOrEmpty(steerAxis))
		{
			vp.SetSteer(Input.GetAxis(steerAxis));
		}

		if (!String.IsNullOrEmpty(ebrakeAxis))
		{
			vp.SetEbrake(Input.GetAxis(ebrakeAxis));
		}

		if (!String.IsNullOrEmpty(boostButton))
		{
			vp.SetBoost(Input.GetButton(boostButton));
		}
		
		if (!String.IsNullOrEmpty(pitchAxis))
		{
			vp.SetPitch(Input.GetAxis(pitchAxis));
		}

		if (!String.IsNullOrEmpty(yawAxis))
		{
			vp.SetYaw(Input.GetAxis(yawAxis));
		}

		if (!String.IsNullOrEmpty(rollAxis))
		{
			vp.SetRoll(Input.GetAxis(rollAxis));
		}

		if (!String.IsNullOrEmpty(upshiftButton))
		{
			vp.SetUpshift(Input.GetAxis(upshiftButton));
		}
		
		if (!String.IsNullOrEmpty(downshiftButton))
		{
			vp.SetDownshift(Input.GetAxis(downshiftButton));
		}
	}
}
