#pragma strict
@RequireComponent(Suspension)
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Suspension/Suspension Property", 2)

//Class for changing the properties of the suspension
public class SuspensionPropertyToggle extends MonoBehaviour
{
	var properties : SuspensionToggledProperty[];
	private var sus : Suspension;

	function Start()
	{
		sus = GetComponent(Suspension);
	}

	//Toggle a property in the properties array at index
	public function ToggleProperty(index : int)
	{
		if (properties.Length - 1 >= index)
		{
			properties[index].toggled = !properties[index].toggled;
			
			if (sus)
			{
				sus.UpdateProperties();
			}
		}
	}

	//Set a property in the properties array at index to the value
	public function SetProperty(index : int, value : boolean)
	{
		if (properties.Length - 1 >= index)
		{
			properties[index].toggled = value;
			
			if (sus)
			{
				sus.UpdateProperties();
			}
		}
	}
}

//Class for a single property
@System.Serializable
public class SuspensionToggledProperty
{
	public enum Properties {steerEnable, steerInvert, driveEnable, driveInvert, ebrakeEnable, skidSteerBrake}//The type of property
	//steerEnable = enable steering
	//steerInvert = invert steering
	//driveEnable = enable driving
	//driveInvert = invert drive
	//ebrakeEnable = can ebrake
	//skidSteerBrake = brake is specially adjusted for skid steering

	var property : Properties;//The property
	var toggled : boolean;//Is it enabled?
}