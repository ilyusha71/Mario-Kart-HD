#pragma strict
@script RequireComponent(VehicleParent)
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Effects/Light Controller", 2)

//Class for controlling vehicle lights
public class LightController extends MonoBehaviour
{
	private var vp : VehicleParent;

	var headlightsOn : boolean;
	var highBeams : boolean;
	var brakelightsOn : boolean;
	var rightBlinkersOn : boolean;
	var leftBlinkersOn : boolean;
	var blinkerInterval : float = 0.3f;
	private var blinkerIntervalOn : boolean;
	private var blinkerSwitchTime : float;
	var reverseLightsOn : boolean;

	var transmission : Transmission;
	private var gearTrans : GearboxTransmission;
	private var conTrans : ContinuousTransmission;

	var headlights : VehicleLight[];
	var brakeLights : VehicleLight[];
	var RightBlinkers : VehicleLight[];
	var LeftBlinkers : VehicleLight[];
	var ReverseLights : VehicleLight[];

	function Start()
	{
		vp = GetComponent(VehicleParent);

		//Get transmission for using reverse lights
		if (transmission)
		{
			if (transmission.GetComponent(GearboxTransmission))
			{
				gearTrans = transmission as GearboxTransmission;
			}
			else if (transmission.GetComponent(ContinuousTransmission))
			{
				conTrans = transmission as ContinuousTransmission;
			}
		}
	}

	function Update()
	{
		//Activate blinkers
		if (leftBlinkersOn || rightBlinkersOn)
		{
			if (blinkerSwitchTime == 0)
			{
				blinkerIntervalOn = !blinkerIntervalOn;
				blinkerSwitchTime = blinkerInterval;
			}
			else
			{
				blinkerSwitchTime = Mathf.Max(0, blinkerSwitchTime - Time.deltaTime);
			}
		}
		else
		{
			blinkerIntervalOn = false;
			blinkerSwitchTime = 0;
		}

		//Activate reverse lights
		if (gearTrans)
		{
			reverseLightsOn = gearTrans.curGearRatio < 0;
		}
		else if (conTrans)
		{
			reverseLightsOn = conTrans.reversing;
		}

		//Activate brake lights
		if (vp.accelAxisIsBrake)
		{
			brakelightsOn = vp.accelInput != 0 && Mathf.Sign(vp.accelInput) != Mathf.Sign(vp.localVelocity.z) && Mathf.Abs(vp.localVelocity.z) > 1;
		}
		else
		{
			if (!vp.brakeIsReverse)
			{
				brakelightsOn = (vp.burnout > 0 && vp.brakeInput > 0) || vp.brakeInput > 0;
			}
			else
			{
				brakelightsOn = (vp.burnout > 0 && vp.brakeInput > 0) || ((vp.brakeInput > 0 && vp.localVelocity.z > 1) || (vp.accelInput > 0 && vp.localVelocity.z < -1));
			}
		}

		SetLights(headlights, highBeams, headlightsOn);
		SetLights(brakeLights, headlightsOn || highBeams, brakelightsOn);
		SetLights(RightBlinkers, rightBlinkersOn && blinkerIntervalOn);
		SetLights(LeftBlinkers, leftBlinkersOn && blinkerIntervalOn);
		SetLights(ReverseLights, reverseLightsOn);
	}

	//Set if lights are on or off based on the condition
	function SetLights(lights : VehicleLight[], condition : boolean)
	{
		for (var curLight : VehicleLight in lights)
		{
			curLight.on = condition;
		}
	}
	
	function SetLights(lights : VehicleLight[], condition : boolean, halfCondition : boolean)
	{
		for (var curLight : VehicleLight in lights)
		{
			curLight.on = condition;
			curLight.halfOn = halfCondition;
		}
	}
}