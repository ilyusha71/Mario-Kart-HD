#if UNITY_EDITOR
@CustomEditor(typeof(GasMotor))
@CanEditMultipleObjects

public class GasMotorEditor extends Editor
{
	var topSpeed : float = 0;

	public override function OnInspectorGUI()
	{
		var targetScript : GasMotor = target as GasMotor;
		var nextOutput : DriveForce;
		var nextTrans : Transmission;
		var nextGearbox : GearboxTransmission;
		var nextConTrans : ContinuousTransmission;
		var nextSus : Suspension;
		var reachedEnd : boolean = false;
		var endOutput : String = "";

		if (targetScript.outputDrives != null)
		{
			if (targetScript.outputDrives.Length > 0)
			{
				topSpeed = targetScript.torqueCurve.keys[targetScript.torqueCurve.length - 1].time * 1000;
				nextOutput = targetScript.outputDrives[0];

				while (!reachedEnd)
				{
					if (nextOutput)
					{
						if (nextOutput.GetComponent(Transmission))
						{
							nextTrans = nextOutput.GetComponent(Transmission);

							if (nextTrans.GetComponent(GearboxTransmission))
							{
								nextGearbox = nextTrans as GearboxTransmission;
								topSpeed /= nextGearbox.gears[nextGearbox.gears.Length - 1].ratio;
							}
							else if (nextTrans.GetComponent(ContinuousTransmission))
							{
								nextConTrans = nextTrans as ContinuousTransmission;
								topSpeed /= nextConTrans.maxRatio;
							}

							if (nextTrans.outputDrives.Length > 0)
							{
								nextOutput = nextTrans.outputDrives[0];
							}
							else
							{
								topSpeed = -1;
								reachedEnd = true;
								endOutput = nextTrans.transform.name;
							}
						}
						else if (nextOutput.GetComponent(Suspension))
						{
							nextSus = nextOutput.GetComponent(Suspension);

							if (nextSus.wheel)
							{
								topSpeed /= Mathf.PI * 100;
								topSpeed *= nextSus.wheel.tireRadius * 2 * Mathf.PI;
							}
							else
							{
								topSpeed = -1;
							}

							reachedEnd = true;
							endOutput = nextSus.transform.name;
						}
						else
						{
							topSpeed = -1;
							reachedEnd = true;
							endOutput = targetScript.transform.name;
						}
					}
					else
					{
						topSpeed = -1;
						reachedEnd = true;
						endOutput = targetScript.transform.name;
					}
				}
			}
			else
			{
				topSpeed = -1;
				endOutput = targetScript.transform.name;
			}
		}
		else
		{
			topSpeed = -1;
			endOutput = targetScript.transform.name;
		}

		if (topSpeed == -1)
		{
			EditorGUILayout.HelpBox("Motor drive doesn't reach any wheels.  (Ends at " + endOutput + ")", MessageType.Warning);
		}
		else if (targets.Length == 1)
		{
			EditorGUILayout.LabelField("Top Speed (Estimate): " + (topSpeed * 2.23694f).ToString("0.00") + " mph || " + (topSpeed * 3.6f).ToString("0.00") + " km/h", EditorStyles.boldLabel);
		}

		DrawDefaultInspector();
	}
}
#endif