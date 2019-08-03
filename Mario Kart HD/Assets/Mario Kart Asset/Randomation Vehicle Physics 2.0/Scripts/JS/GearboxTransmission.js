#pragma strict
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Drivetrain/Transmission/Gearbox Transmission", 0)

//Transmission subclass for gearboxes
public class GearboxTransmission extends Transmission
{
	var gears : Gear[];
	var startGear : int;
	@System.NonSerialized
	var currentGear : int;
	private var firstGear : int;
	@System.NonSerialized
	var curGearRatio : float;//Ratio of the current gear

	var skipNeutral : boolean;

	@Tooltip("Calculate the RPM ranges of the gears in play mode.  This will overwrite the current values")
	var autoCalculateRpmRanges : boolean;

	@Tooltip("Number of physics steps a shift should last")
	var shiftDelay : float;
	@System.NonSerialized
	var shiftTime : float;

	private var upperGear : Gear;//Next gear above current
	private var lowerGear : Gear;//Next gear below current
	private var upshiftDifference : float;//RPM difference between current gear and upper gear
	private var downshiftDifference : float;//RPM difference between current gear and lower gear

	@Tooltip("Multiplier for comparisons in automatic shifting calculations, should be 2 in most cases")
	var shiftThreshold : float;
	
	public function Start()
	{
		super.Start();

		currentGear = Mathf.Clamp(startGear, 0, gears.Length - 1);

		//Get gear number 1 (first one above neutral)
		GetFirstGear();
	}

	function Update()
	{
		//Check for manual shift button presses
		if (!automatic)
		{
			if (vp.upshiftPressed)
			{
				Shift(1);
			}

			if (vp.downshiftPressed)
			{
				Shift (-1);
			}
		}
	}

	function FixedUpdate()
	{
		health = Mathf.Clamp01(health);
		shiftTime = Mathf.Max(0, shiftTime - Time.timeScale * TimeMaster.inverseFixedTimeFactor);
		curGearRatio = gears[currentGear].ratio;

		//Calculate upperGear and lowerGear
		var actualFeedbackRPM : float = targetDrive.feedbackRPM / Mathf.Abs(curGearRatio);
		var upGearOffset : int = 1;
		var downGearOffset : int = 1;

		while ((skipNeutral || automatic) && gears[Mathf.Clamp(currentGear + upGearOffset, 0, gears.Length - 1)].ratio == 0 && currentGear + upGearOffset != 0 && currentGear + upGearOffset != gears.Length - 1)
		{
			upGearOffset ++;
		}

		while ((skipNeutral || automatic) && gears[Mathf.Clamp(currentGear - downGearOffset, 0, gears.Length - 1)].ratio == 0 && currentGear - downGearOffset != 0 && currentGear - downGearOffset != 0)
		{
			downGearOffset ++;
		}

		upperGear = gears[Mathf.Min(gears.Length - 1, currentGear + upGearOffset)];
		lowerGear = gears[Mathf.Max(0, currentGear - downGearOffset)];

		//Perform RPM calculations
		if (maxRPM == -1)
		{
			maxRPM = targetDrive.curve.keys[targetDrive.curve.length - 1].time;

			if (autoCalculateRpmRanges)
			{
				CalculateRpmRanges();
			}
		}

		//Set RPMs and torque of output
		newDrive.curve = targetDrive.curve;
		
		if (curGearRatio == 0 || shiftTime > 0)
		{
			newDrive.rpm = 0;
			newDrive.torque = 0;
		}
		else
		{
			newDrive.rpm = (automatic && skidSteerDrive ? Mathf.Abs(targetDrive.rpm) * Mathf.Sign(vp.accelInput - (vp.brakeIsReverse ? vp.brakeInput * (1 - vp.burnout) : 0)) : targetDrive.rpm) / curGearRatio;
			newDrive.torque = Mathf.Abs(curGearRatio) * targetDrive.torque;
		}

		//Perform automatic shifting
		upshiftDifference = gears[currentGear].maxRPM - upperGear.minRPM;
		downshiftDifference = lowerGear.maxRPM - gears[currentGear].minRPM;
		
		if (automatic && shiftTime == 0 && vp.groundedWheels > 0)
		{
			if (!skidSteerDrive && vp.burnout == 0)
			{
				if (Mathf.Abs(vp.localVelocity.z) > 1 || vp.accelInput > 0 || (vp.brakeInput > 0 && vp.brakeIsReverse))
				{
					if (currentGear < gears.Length - 1 && (upperGear.minRPM + upshiftDifference * (curGearRatio < 0 ? Mathf.Min(1, shiftThreshold) : shiftThreshold) - actualFeedbackRPM <= 0 || (curGearRatio <= 0 && upperGear.ratio > 0 && (!vp.reversing || (vp.accelInput > 0 && vp.localVelocity.z > curGearRatio * 10)))) && !(vp.brakeInput > 0 && vp.brakeIsReverse && upperGear.ratio >= 0) && !(vp.localVelocity.z < 0 && vp.accelInput == 0))
					{
						Shift(1);
					}
					else if (currentGear > 0 && (actualFeedbackRPM - (lowerGear.maxRPM - downshiftDifference * shiftThreshold) <= 0 || (curGearRatio >= 0 && lowerGear.ratio < 0 && (vp.reversing || ((vp.accelInput < 0 || (vp.brakeInput > 0 && vp.brakeIsReverse)) && vp.localVelocity.z < curGearRatio * 10)))) && !(vp.accelInput > 0 && lowerGear.ratio <= 0) && (lowerGear.ratio > 0 || vp.localVelocity.z < 1))
					{
						Shift(-1);
					}
				}
			}
			else if (currentGear != firstGear)
			{
				//Shift into first gear if skid steering
				ShiftToGear(firstGear);
			}
		}

		SetOutputDrives(curGearRatio);
	}

	//Shift gears by the number entered
	public function Shift(dir : int)
	{
		if (health > 0)
		{
			shiftTime = shiftDelay;
			currentGear += dir;
			
			while ((skipNeutral || automatic) && gears[Mathf.Clamp(currentGear, 0, gears.Length - 1)].ratio == 0 && currentGear != 0 && currentGear != gears.Length - 1)
			{
				currentGear += dir;
			}
			
			currentGear = Mathf.Clamp(currentGear, 0, gears.Length - 1);
		}
	}

	//Shift straight to the gear specified
	public function ShiftToGear(gear : int)
	{
		if (health > 0)
		{
			shiftTime = shiftDelay;
			currentGear = Mathf.Clamp(gear, 0, gears.Length - 1);
		}
	}

	//Caculate ideal RPM ranges for each gear (works most of the time)
	public function CalculateRpmRanges()
	{
		var cantCalc : boolean = false;
		if (!Application.isPlaying)
		{
			var engine : GasMotor = F.GetTopmostParentComponent(VehicleParent, transform).GetComponentInChildren(GasMotor);

			if (engine)
			{
				maxRPM = engine.torqueCurve.keys[engine.torqueCurve.length - 1].time;
			}
			else
			{
				Debug.LogError("There is no <GasMotor> in the vehicle to get RPM info from.", this);
				cantCalc = true;
			}
		}

		if (!cantCalc)
		{
			var prevGearRatio : float;
			var nextGearRatio : float;
			var actualMaxRPM : float = maxRPM * 1000;

			for (var i : int = 0; i < gears.Length; i++)
			{
				prevGearRatio = gears[Mathf.Max(i - 1, 0)].ratio;
				nextGearRatio = gears[Mathf.Min(i + 1, gears.Length - 1)].ratio;

				if (gears[i].ratio < 0)
				{
					gears[i].minRPM = actualMaxRPM / gears[i].ratio;

					if (nextGearRatio == 0)
					{
						gears[i].maxRPM = 0;
					}
					else
					{
						gears[i].maxRPM = actualMaxRPM / nextGearRatio + (actualMaxRPM / nextGearRatio - gears[i].minRPM) * 0.5f;
					}
				}
				else if (gears[i].ratio > 0)
				{
					gears[i].maxRPM = actualMaxRPM / gears[i].ratio;

					if (prevGearRatio == 0)
					{
						gears[i].minRPM = 0;
					}
					else
					{
						gears[i].minRPM = actualMaxRPM / prevGearRatio - (gears[i].maxRPM - actualMaxRPM / prevGearRatio) * 0.5f;
					}
				}
				else
				{
					gears[i].minRPM = 0;
					gears[i].maxRPM = 0;
				}

				gears[i].minRPM *= 0.5f;
				gears[i].maxRPM *= 0.5f;
			}
		}
	}
	
	public function GetFirstGear()
	{
		for (var i : int = 0; i < gears.Length; i++)
		{
			if (gears[i].ratio == 0)
			{
				firstGear = i + 1;
				break;
			}
		}
	}
}

//Gear class
@System.Serializable
public class Gear
{
	var ratio : float;
	var minRPM : float;
	var maxRPM : float;
}