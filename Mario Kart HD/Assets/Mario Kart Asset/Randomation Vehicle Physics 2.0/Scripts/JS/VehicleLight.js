#pragma strict
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Effects/Vehicle Light", 3)

//Class for individual vehicle lights
public class VehicleLight extends MonoBehaviour
{
	private var rend : Renderer;
	private var shatter : ShatterPart;
	var on : boolean;

	@Tooltip("Example: a brake light would be half on when the night lights are on, and fully on when the brakes are pressed")
	var halfOn : boolean;
	var targetLight : Light;

	@Tooltip("A light shared with another vehicle light, will turn off if one of the lights break, then the unbroken light will turn on its target light")
	var sharedLight : Light;

	@Tooltip("Vehicle light that the shared light is shared with")
	var sharer : VehicleLight;
	var onMaterial : Material;
	private var offMaterial : Material;

	@System.NonSerialized
	var shattered : boolean;

	function Start()
	{
		rend = GetComponent(Renderer);
		if (rend)
		{
			offMaterial = rend.sharedMaterial;
		}
		
		shatter = GetComponent(ShatterPart);
	}

	function Update()
	{
		if (shatter)
		{
			shattered = shatter.shattered;
		}

		//Configure shared light
		if (sharedLight && sharer)
		{
			sharedLight.enabled = on && sharer.on && !shattered && !sharer.shattered;
		}

		//Configure target light
		if (targetLight)
		{
			if (sharedLight && sharer)
			{
				targetLight.enabled = !shattered && on && !sharedLight.enabled;
			}
		}

		//Shatter logic
		if (rend)
		{
			if (shattered)
			{
				if (shatter.brokenMaterial)
				{
					rend.sharedMaterial = shatter.brokenMaterial;
				}
				else
				{
					rend.sharedMaterial = on || halfOn ? onMaterial : offMaterial;
				}
			}
			else
			{
				rend.sharedMaterial = on || halfOn ? onMaterial : offMaterial;
			}
		}
	}
}