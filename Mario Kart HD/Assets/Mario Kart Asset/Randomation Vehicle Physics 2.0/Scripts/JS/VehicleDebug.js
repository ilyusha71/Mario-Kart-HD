#pragma strict
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Vehicle Controllers/Vehicle Debug", 3)

//Class for easily resetting vehicles
public class VehicleDebug extends MonoBehaviour
{
	var spawnPos : Vector3;
	var spawnRot : Vector3;

	@Tooltip("Y position below which the vehicle will be reset")
	var fallLimit : float = -10;

	function Update()
	{
		if (Input.GetButtonDown("Reset Rotation"))
		{
			StartCoroutine(ResetRotation());
		}

		if (Input.GetButtonDown("Reset Position") || transform.position.y < fallLimit)
		{
			StartCoroutine(ResetPosition());
		}
	}

	function ResetRotation()
	{
		if (GetComponent(VehicleDamage))
		{
			GetComponent(VehicleDamage).Repair();
		}

		yield new WaitForFixedUpdate();
		transform.eulerAngles = new Vector3(0, transform.eulerAngles.y, 0);
		transform.Translate(Vector3.up,Space.World);
		GetComponent(Rigidbody).velocity = Vector3.zero;
		GetComponent(Rigidbody).angularVelocity = Vector3.zero;
	}

	function ResetPosition()
	{
		if (GetComponent(VehicleDamage))
		{
			GetComponent(VehicleDamage).Repair();
		}

		transform.position = spawnPos;
		yield new WaitForFixedUpdate();
		transform.rotation = Quaternion.LookRotation(spawnRot, GlobalControl.worldUpDir);
		GetComponent(Rigidbody).velocity = Vector3.zero;
		GetComponent(Rigidbody).angularVelocity = Vector3.zero;
	}
}
