#pragma strict

//Class for engines
public class Motor extends MonoBehaviour
{
	protected var vp : VehicleParent;
	var ignition : boolean;
	var power : float = 1;

	@Tooltip("Throttle curve, x-axis = input, y-axis = output")
	var inputCurve : AnimationCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);
	protected var actualInput : float;//Input after applying the input curve

	protected var snd : AudioSource;

	@Header("Engine Audio")

	var minPitch : float;
	var maxPitch : float;
	@System.NonSerialized
	var targetPitch : float;
	protected var pitchFactor : float;
	protected var airPitch : float;

	@Header("Nitrous Boost")

	var canBoost : boolean = true;
	@System.NonSerialized
	var boosting : boolean;
	var boost : float = 1;
	private var boostReleased : boolean;
	private var boostPrev : boolean;
	
	@Tooltip("X-axis = local z-velocity, y-axis = power")
	var boostPowerCurve : AnimationCurve = AnimationCurve.EaseInOut(0, 0.1f, 50, 0.2f);
	var maxBoost : float = 1;
	var boostBurnRate : float = 0.01f;
	var boostLoopSnd : AudioSource;
	private var boostSnd : AudioSource;//AudioSource for boostStart and boostEnd
	var boostStart : AudioClip;
	var boostEnd : AudioClip;
	var boostParticles : ParticleSystem[];
	
	@Header("Damage")

	@RangeAttribute(0, 1)
	var strength : float = 1;
	@System.NonSerialized
	var health : float = 1;
	var damagePitchWiggle : float;
	var smoke : ParticleSystem;
	private var initialSmokeEmission : float;
	
	public function Start()
	{
		vp = F.GetTopmostParentComponent(VehicleParent, transform) as VehicleParent;

		//Get engine sound
		snd = GetComponent(AudioSource);
		if (snd)
		{
			snd.pitch = minPitch;
		}

		//Get boost sound
		if (boostLoopSnd)
		{
			var newBoost : GameObject = Instantiate(boostLoopSnd.gameObject, boostLoopSnd.transform.position, boostLoopSnd.transform.rotation) as GameObject;
			boostSnd = newBoost.GetComponent(AudioSource);
			boostSnd.transform.parent = boostLoopSnd.transform;
			boostSnd.transform.localPosition = Vector3.zero;
			boostSnd.transform.localRotation = Quaternion.identity;
			boostSnd.loop = false;
		}
		
		if (smoke)
		{
		    initialSmokeEmission = smoke.emission.rate.constantMax;
		}
	}

	public function FixedUpdate()
	{
		health = Mathf.Clamp01(health);
		
		//Boost logic
		boost = Mathf.Clamp(boosting ? boost - boostBurnRate * Time.timeScale * 0.05f * TimeMaster.inverseFixedTimeFactor : boost, 0, maxBoost);
		boostPrev = boosting;

		if (canBoost && ignition && health > 0 && !vp.crashing && boost > 0 && (vp.hover ? vp.accelInput != 0 || Mathf.Abs(vp.localVelocity.z) > 1 : vp.accelInput > 0 || vp.localVelocity.z > 1))
		{
			if (((boostReleased && !boosting) || boosting) && vp.boostButton)
			{
				boosting = true;
				boostReleased = false;
			}
			else
			{
				boosting = false;
			}
		}
		else
		{
			boosting = false;
		}

		if (!vp.boostButton)
		{
			boostReleased = true;
		}

		if (boostLoopSnd && boostSnd)
		{
			if (boosting && !boostLoopSnd.isPlaying)
			{
				boostLoopSnd.Play();
			}
			else if (!boosting && boostLoopSnd.isPlaying)
			{
				boostLoopSnd.Stop();
			}
			
			if (boosting && !boostPrev)
			{
				boostSnd.clip = boostStart;
				boostSnd.Play();
			}
			else if (!boosting && boostPrev)
			{
				boostSnd.clip = boostEnd;
				boostSnd.Play();
			}
		}
	}

	public function Update()
	{
		//Set engine sound properties
		if (!ignition)
		{
			targetPitch = 0;
		}
		
		if (snd)
		{
			if (ignition && health > 0)
			{
				snd.enabled = true;
				snd.pitch = Mathf.Lerp(snd.pitch, Mathf.Lerp(minPitch, maxPitch, targetPitch), 20 * Time.deltaTime) + Mathf.Sin(Time.time * 200 * (1 - health)) * (1 - health) * 0.1f * damagePitchWiggle;
				snd.volume = Mathf.Lerp(snd.volume, 0.3f + targetPitch * 0.7f, 20 * Time.deltaTime);
			}
			else
			{
				snd.enabled = false;
			}
		}

		//Play boost particles
		if (boostParticles.Length > 0)
		{
			for (var curBoost : ParticleSystem in boostParticles)
			{
				if (boosting && curBoost.isStopped)
				{
					curBoost.Play();
				}
				else if (!boosting && curBoost.isPlaying)
				{
					curBoost.Stop();
				}
			}
		}
		
		if (smoke)
		{
		    var em : ParticleSystem.EmissionModule = smoke.emission;
		    em.rate = new ParticleSystem.MinMaxCurve(health < 0.7f ? initialSmokeEmission * (1 - health) : 0);
		}
	}
}