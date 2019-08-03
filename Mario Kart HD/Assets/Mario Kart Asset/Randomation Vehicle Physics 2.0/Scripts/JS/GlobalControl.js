#pragma strict
import UnityEngine.SceneManagement;
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Scene Controllers/Global Control", 0)

//Global controller class
public class GlobalControl extends MonoBehaviour
{
	@Tooltip("Reload the scene with the 'Restart' button in the input manager")
	var quickRestart : boolean = true;
	private var initialFixedTime : float;

	@Tooltip("Mask for what the wheels collide with")
	var wheelCastMask : LayerMask;
	static var wheelCastMaskStatic : LayerMask;

	@Tooltip("Mask for objects which vehicles check against if they are rolled over")
	var groundMask : LayerMask;
	static var groundMaskStatic : LayerMask;
	
	@Tooltip("Mask for objects that cause damage to vehicles")
	var damageMask : LayerMask;
	static var damageMaskStatic : LayerMask;
	
	static var ignoreWheelCastLayer : int;

	@Tooltip("Frictionless physic material")
	var frictionlessMat : PhysicMaterial;
	static var frictionlessMatStatic : PhysicMaterial;

	static var worldUpDir : Vector3;//Global up direction, opposite of normalized gravity direction

	@Tooltip("Maximum segments per tire mark")
	var tireMarkLength : int;
	static var tireMarkLengthStatic : int;

	@Tooltip("Gap between tire mark segments")
	var tireMarkGap : float;
	static var tireMarkGapStatic : float;

	@Tooltip("Tire mark height above ground")
	var tireMarkHeight : float;
	static var tireMarkHeightStatic : float;

	@Tooltip("Lifetime of tire marks")
	var tireFadeTime : float;
	static var tireFadeTimeStatic : float;

	function Start()
	{
		initialFixedTime = Time.fixedDeltaTime;
		//Set static variables
		wheelCastMaskStatic = wheelCastMask;
		groundMaskStatic = groundMask;
		damageMaskStatic = damageMask;
		ignoreWheelCastLayer = LayerMask.NameToLayer("Ignore Wheel Cast");
		frictionlessMatStatic = frictionlessMat;
		tireMarkLengthStatic = Mathf.Max(tireMarkLength, 2);
		tireMarkGapStatic = tireMarkGap;
		tireMarkHeightStatic = tireMarkHeight;
		tireFadeTimeStatic = tireFadeTime;
	}

	function Update()
	{
		if (quickRestart)
		{
			if (Input.GetButtonDown("Restart"))
			{
			    SceneManager.LoadScene(SceneManager.GetActiveScene().name);
				Time.timeScale = 1;
				Time.fixedDeltaTime = initialFixedTime;
			}
		}
	}

	function FixedUpdate()
	{
		worldUpDir = Physics.gravity.sqrMagnitude == 0 ? Vector3.up : -Physics.gravity.normalized;
	}
}