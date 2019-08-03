#pragma strict
import UnityEngine.Audio;
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Scene Controllers/Time Master", 1)

//Class for managing time
public class TimeMaster extends MonoBehaviour
{
	private var initialFixedTime : float;//Intial Time.fixedDeltaTime

	@Tooltip("Master audio mixer")
	var masterMixer : AudioMixer;
	var destroyOnLoad : boolean;
	static var fixedTimeFactor : float;//Multiplier for certain variables to change consistently over varying time steps
	static var inverseFixedTimeFactor : float;

	function Awake()
	{
		initialFixedTime = Time.fixedDeltaTime;
		
		if (!destroyOnLoad)
		{
			DontDestroyOnLoad(gameObject);
		}
	}

	function Update()
	{
		//Set the pitch of all audio to the time scale
		if (masterMixer)
		{
			masterMixer.SetFloat("MasterPitch", Time.timeScale);
		}
	}

	function FixedUpdate()
	{
		//Set the fixed update rate based on time scale
		Time.fixedDeltaTime = Time.timeScale * initialFixedTime;
		fixedTimeFactor = 0.01f / initialFixedTime;
		inverseFixedTimeFactor = 1 / fixedTimeFactor;
	}
}
