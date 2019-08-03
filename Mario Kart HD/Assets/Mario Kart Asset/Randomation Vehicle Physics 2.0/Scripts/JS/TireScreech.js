﻿#pragma strict
@RequireComponent(AudioSource)
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Effects/Tire Screech Audio", 1)

//Class for playing tire screech sounds
public class TireScreech extends MonoBehaviour
{
	private var snd : AudioSource;
	private var vp : VehicleParent;
	private var wheels : Wheel[];
	private var slipThreshold : float;
	private var surfaceType : GroundSurface;

	function Start()
	{
		snd = GetComponent(AudioSource);
		vp = F.GetTopmostParentComponent(VehicleParent, transform) as VehicleParent;
		wheels = new Wheel[vp.wheels.Length];

		//Get wheels and average slip threshold
		for (var i : int = 0; i < vp.wheels.Length; i++)
		{
			wheels[i] = vp.wheels[i];
			if (vp.wheels[i].GetComponent(TireMarkCreate))
			{
				var newThreshold : float = vp.wheels[i].GetComponent(TireMarkCreate).slipThreshold;
				slipThreshold = i == 0 ? newThreshold : (slipThreshold + newThreshold) * 0.5f;
			}
		}
	}

	function Update()
	{
		var screechAmount : float = 0;
		var allPopped : boolean = true;
		var nonePopped : boolean = true;
		var alwaysScrape : float = 0;

		for (var i : int = 0; i < vp.wheels.Length; i++)
		{
			if (wheels[i].connected)
			{
				if (Mathf.Abs(F.MaxAbs(wheels[i].sidewaysSlip, wheels[i].forwardSlip, alwaysScrape)) - slipThreshold > 0)
				{
					if (wheels[i].popped)
					{
						nonePopped = false;
					}
					else
					{
						allPopped = false;
					}
				}

				if (wheels[i].grounded)
				{
					surfaceType = GroundSurfaceMaster.surfaceTypesStatic[wheels[i].contactPoint.surfaceType];

					if (surfaceType.alwaysScrape)
					{
						alwaysScrape = slipThreshold + Mathf.Min(0.5f, Mathf.Abs(wheels[i].rawRPM * 0.001f));
					}
				}

				screechAmount = Mathf.Max(screechAmount, Mathf.Pow(Mathf.Clamp01(Mathf.Abs(F.MaxAbs(wheels[i].sidewaysSlip, wheels[i].forwardSlip, alwaysScrape)) - slipThreshold), 2));
			}
		}

		//Set audio clip based on number of wheels popped
		if (surfaceType != null)
		{
			snd.clip = allPopped ? surfaceType.rimSnd : (nonePopped ? surfaceType.tireSnd : surfaceType.tireRimSnd);
		}

		//Set sound volume and pitch
		if (screechAmount > 0)
		{
			if (!snd.isPlaying)
			{
				snd.Play();
				snd.volume = 0;
			}
			else
			{
				snd.volume = Mathf.Lerp(snd.volume, screechAmount * ((vp.groundedWheels * 1.0f) / (wheels.Length * 1.0f)), 2 * Time.deltaTime);
				snd.pitch = Mathf.Lerp(snd.pitch, 0.5f + screechAmount * 0.9f, 2 * Time.deltaTime);
			}
		}
		else if (snd.isPlaying)
		{
			snd.volume = 0;
			snd.Stop();
		}
	}
}
