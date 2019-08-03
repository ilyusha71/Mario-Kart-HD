#pragma strict
@AddComponentMenu("RVP/JS/Suspension/Suspension Property Setter", 3)

//Class for cycling through suspension properties
public class PropertyToggleSetter extends MonoBehaviour
{
	@Tooltip("Steering Controller")
	var steerer : SteeringControl;
	var transmission : Transmission;

	@Tooltip("Suspensions with properties to be toggled")
	var suspensionProperties : SuspensionPropertyToggle[];
	var presets : PropertyTogglePreset[];
	var currentPreset : int;

	@Tooltip("Input manager button which increments the preset")
	var changeButton : String;

	function Update()
	{
		if (!String.IsNullOrEmpty(changeButton))
		{
			if (Input.GetButtonDown(changeButton))
			{
				ChangePreset(currentPreset + 1);
			}
		}
	}

	//Change the current preset
	public function ChangePreset(preset : int)
	{
		currentPreset = preset % (presets.Length);

		if (steerer)
		{
			steerer.limitSteer = presets[currentPreset].limitSteer;
		}

		if (transmission)
		{
			transmission.skidSteerDrive = presets[currentPreset].skidSteerTransmission;
		}

		for (var i : int = 0; i < suspensionProperties.Length; i++)
		{
			for (var j : int = 0; j < suspensionProperties[i].properties.Length; j++)
			{
				suspensionProperties[i].SetProperty(j, presets[currentPreset].wheels[i].preset[j]);
			}
		}
	}
}

//Preset class
@System.Serializable
public class PropertyTogglePreset
{
	@Tooltip("Limit the steering range of wheels based on SteeringControl's curve?")
	var limitSteer : boolean = true;
	@Tooltip("Transmission is adjusted for skid steering?")
	var skidSteerTransmission : boolean;
	@Tooltip("Must be equal to the number of wheels")
	var wheels : IndividualPreset[];
}

//Class for toggling the properties of SuspensionPropertyToggle instances
@System.Serializable
public class IndividualPreset
{
	@Tooltip("Must be equal to the SuspensionPropertyToggle properties array length")
	var preset : boolean[];
}