#pragma strict
@script RequireComponent(Camera)
@script RequireComponent(AudioListener)
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Camera/Camera Control", 0)

//Class for controlling the camera
public class CameraControl extends MonoBehaviour
{
	private var tr : Transform;
	private var cam : Camera;
	private var vp : VehicleParent;
	var target : Transform;//The target vehicle
	private var targetBody : Rigidbody;
	
	var height : float;
	var distance : float;

	private var xInput : float;
	private var yInput : float;

	private var lookDir : Vector3;
	private var smoothYRot : float;
	private var lookObj : Transform;
	private var forwardLook : Vector3;
	private var upLook : Vector3;
	private var targetForward : Vector3;
	private var targetUp : Vector3;
	@Tooltip("Should the camera stay flat? (Local y-axis always points up)")
	var stayFlat : boolean;

	@Tooltip("Mask for which objects will be checked in between the camera and target vehicle")
	var castMask : LayerMask;

	function Start()
	{
		tr = transform;
		cam = GetComponent(Camera);
		Initialize();
	}

	public function Initialize()
	{
		//lookObj is an object used to help position and rotate the camera
		if (!lookObj)
		{
			var lookTemp : GameObject = new GameObject("Camera Looker");
			lookObj = lookTemp.transform;
		}

		//Set variables based on target vehicle's properties
		if (target)
		{
			vp = target.GetComponent(VehicleParent);
			distance += vp.cameraDistanceChange;
			height += vp.cameraHeightChange;
			forwardLook = target.forward;
			upLook = target.up;
			targetBody = target.GetComponent(Rigidbody);
		}

		//Set the audio listener update mode to fixed, because the camera moves in FixedUpdate
		//This is necessary for doppler effects to sound correct
		GetComponent(AudioListener).velocityUpdateMode = AudioVelocityUpdateMode.Fixed;
	}

	function FixedUpdate()
	{
		if (target && targetBody && target.gameObject.activeSelf)
		{
			if (vp.groundedWheels > 0)
			{
				targetForward = stayFlat ? new Vector3(vp.norm.up.x, 0, vp.norm.up.z) : vp.norm.up;
			}
			
			targetUp = stayFlat ? GlobalControl.worldUpDir : vp.norm.forward;
			lookDir = Vector3.Slerp(lookDir, (xInput == 0 && yInput == 0 ? Vector3.forward : new Vector3(xInput, 0, yInput).normalized), 0.1f * TimeMaster.inverseFixedTimeFactor);
			smoothYRot = Mathf.Lerp(smoothYRot, targetBody.angularVelocity.y, 0.02f * TimeMaster.inverseFixedTimeFactor);

			//Determine the upwards direction of the camera
			var hit : RaycastHit;
			if (Physics.Raycast(target.position, -targetUp, hit, 1) && !stayFlat)
			{
				upLook = Vector3.Lerp(upLook, (Vector3.Dot(hit.normal, targetUp) > 0.5 ? hit.normal : targetUp), 0.05f * TimeMaster.inverseFixedTimeFactor);
			}
			else
			{
				upLook = Vector3.Lerp(upLook, targetUp, 0.05f * TimeMaster.inverseFixedTimeFactor);
			}

			//Calculate rotation and position variables
			forwardLook = Vector3.Lerp(forwardLook, targetForward, 0.05f * TimeMaster.inverseFixedTimeFactor);
			lookObj.rotation = Quaternion.LookRotation(forwardLook, upLook);
			lookObj.position = target.position;
			var lookDirActual : Vector3 = (lookDir - new Vector3(Mathf.Sin(smoothYRot), 0, Mathf.Cos(smoothYRot)) * Mathf.Abs(smoothYRot) * 0.2f).normalized;
			var forwardDir : Vector3 = lookObj.TransformDirection(lookDirActual);
			var localOffset : Vector3 = lookObj.TransformPoint(-lookDirActual * distance - lookDirActual * Mathf.Min(targetBody.velocity.magnitude * 0.05f, 2) + new Vector3(0,height,0));

			//Check if there is an object between the camera and target vehicle and move the camera in front of it
			if (Physics.Linecast(target.position, localOffset, hit, castMask))
			{
				tr.position = hit.point + (target.position - localOffset).normalized * (cam.nearClipPlane + 0.1f);
			}
			else
			{
				tr.position = localOffset;
			}

			tr.rotation = Quaternion.LookRotation(forwardDir, lookObj.up);
		}
	}

	//function for setting the rotation input of the camera
	public function SetInput(x : float, y : float)
	{
		xInput = x;
		yInput = y;
	}
	
	//Destroy lookObj
	function OnDestroy()
	{
		if (lookObj)
		{
			Destroy(lookObj.gameObject);
		}
	}
}
