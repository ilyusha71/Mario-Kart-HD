#pragma strict
import UnityEngine.UI;
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Demo Scripts/Vehicle Menu", 0)

//Class for the menu and HUD in the demo
public class VehicleMenu extends MonoBehaviour
{
	var cam : CameraControl;
	var spawnPoint : Vector3;
	var spawnRot : Vector3;
	var vehicles : GameObject[];
	var chaseVehicle : GameObject;
	var chaseVehicleDamage : GameObject;
	private var chaseCarSpawnTime : float;
	private var newVehicle : GameObject;
	private var autoShift : boolean;
	private var assist : boolean;
	private var stuntMode : boolean;
	var autoShiftToggle : Toggle;
	var assistToggle : Toggle;
	var stuntToggle : Toggle;
	var speedText : Text;
	var gearText : Text;
	var rpmMeter : Slider;
	var boostMeter : Slider;
	var propertySetterText : Text;
	var stuntText : Text;
	var scoreText : Text;
	var camToggle : Toggle;
	private var vp : VehicleParent;
	private var engine : Motor;
	private var trans : Transmission;
	private var gearbox : GearboxTransmission;
	private var varTrans : ContinuousTransmission;
	private var stunter : StuntDetect;
	private var stuntEndTime : float = -1;
	private var propertySetter : PropertyToggleSetter;

	function Update()
	{
		autoShift = autoShiftToggle.isOn;
		assist = assistToggle.isOn;
		stuntMode = stuntToggle.isOn;
		cam.stayFlat = camToggle.isOn;
		chaseCarSpawnTime = Mathf.Max(0, chaseCarSpawnTime - Time.deltaTime);
		
		if (vp)
		{
			speedText.text = (vp.velMag * 2.23694f).ToString("0") + " MPH";

			if (trans)
			{
				if (gearbox)
				{
					gearText.text = "Gear: " + (gearbox.currentGear == 0 ? "R" : (gearbox.currentGear == 1 ? "N" : (gearbox.currentGear - 1).ToString()));
				}
				else if (varTrans)
				{
					gearText.text = "Ratio: " + varTrans.currentRatio.ToString("0.00");
				}
			}

			if (engine)
			{
				rpmMeter.value = engine.targetPitch / (engine.maxPitch - engine.minPitch);

				if (engine.maxBoost > 0)
				{
					boostMeter.value = engine.boost / engine.maxBoost;
				}
			}

			if (stuntMode && stunter)
			{
				stuntEndTime = String.IsNullOrEmpty(stunter.stuntString) ? Mathf.Max(0, stuntEndTime - Time.deltaTime) : 2;
				
				if (stuntEndTime == 0)
				{
					stuntText.text = "";
				}
				else if (!String.IsNullOrEmpty(stunter.stuntString))
				{
					stuntText.text = stunter.stuntString;
				}

				scoreText.text = "Score: " + stunter.score.ToString("n0");
			}

			if (propertySetter)
			{
				propertySetterText.text = propertySetter.currentPreset == 0 ? "Normal Steering" : (propertySetter.currentPreset == 1 ? "Skid Steering" : "Crab Steering");
			}
		}
	}

	public function SpawnVehicle(vehicle : int)
	{
		newVehicle = Instantiate(vehicles[vehicle], spawnPoint, Quaternion.LookRotation(spawnRot, GlobalControl.worldUpDir)) as GameObject;
		cam.target = newVehicle.transform;
		cam.Initialize();
		vp = newVehicle.GetComponent(VehicleParent);

		trans = newVehicle.GetComponentInChildren(Transmission) as Transmission;
		if (trans)
		{
			trans.automatic = autoShift;
			newVehicle.GetComponent(VehicleParent).brakeIsReverse = autoShift;

			if (trans.GetComponent(GearboxTransmission))
			{
				gearbox = trans as GearboxTransmission;
			}
			else if (trans.GetComponent(ContinuousTransmission))
			{
				varTrans = trans as ContinuousTransmission;
				
				if (!autoShift)
				{
					vp.brakeIsReverse = true;
				}
			}
		}

		if (newVehicle.GetComponent(VehicleAssist))
		{
			newVehicle.GetComponent(VehicleAssist).enabled = assist;
		}

		if (newVehicle.GetComponent(FlipControl) && newVehicle.GetComponent(StuntDetect))
		{
			newVehicle.GetComponent(FlipControl).flipPower = stuntMode && assist ? new Vector3(10, 10, -10) : Vector3.zero;
			newVehicle.GetComponent(FlipControl).rotationCorrection = stuntMode ? Vector3.zero : (assist ? new Vector3(5, 1, 10) : Vector3.zero);
			newVehicle.GetComponent(FlipControl).stopFlip = assist;
			stunter = newVehicle.GetComponent(StuntDetect);
		}

		engine = newVehicle.GetComponentInChildren(Motor) as Motor;
		propertySetter = newVehicle.GetComponent(PropertyToggleSetter);

		stuntText.gameObject.SetActive(stuntMode);
		scoreText.gameObject.SetActive(stuntMode);
	}

	public function SpawnChaseVehicle()
	{
		if (chaseCarSpawnTime == 0)
		{
			chaseCarSpawnTime = 1;
			var chaseCar : GameObject = Instantiate(chaseVehicle, spawnPoint, Quaternion.LookRotation(spawnRot, GlobalControl.worldUpDir)) as GameObject;
			chaseCar.GetComponent(FollowAI).target = newVehicle.transform;
		}
	}

	public function SpawnChaseVehicleDamage()
	{
		if (chaseCarSpawnTime == 0)
		{
			chaseCarSpawnTime = 1;
			var chaseCar : GameObject = Instantiate(chaseVehicleDamage, spawnPoint, Quaternion.LookRotation(spawnRot, GlobalControl.worldUpDir)) as GameObject;
			chaseCar.GetComponent(FollowAI).target = newVehicle.transform;
		}
	}
}
