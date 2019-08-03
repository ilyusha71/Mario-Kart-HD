#pragma strict
@script RequireComponent(VehicleParent)
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/AI/Follow AI", 0)

//Class for following AI
public class FollowAI extends MonoBehaviour
{
	private var tr : Transform;
	private var rb : Rigidbody;
	private var vp : VehicleParent;
	private var va : VehicleAssist;
	var target : Transform;
	private var targetPrev : Transform;
	private var targetBody : Rigidbody;
	private var targetPoint : Vector3;
	private var targetVisible : boolean;
	private var targetIsWaypoint : boolean;
	private var targetWaypoint : VehicleWaypoint;

	var followDistance : float;
	private var close : boolean;

	@Tooltip("Percentage of maximum speed to drive at")
	@RangeAttribute(0, 1)
	var speed : float = 1;
	private var initialSpeed : float;
	private var prevSpeed : float;
	private var brakeTime : float;

	@Tooltip("Mask for which objects can block the view of the target")
	var viewBlockMask : LayerMask;
	private var dirToTarget : Vector3;//Normalized direction to target
	private var lookDot : float;//Dot product of forward direction and dirToTarget
	private var steerDot : float;//Dot product of right direction and dirToTarget

	private var stoppedTime : float;
	private var reverseTime : float;

	@Tooltip("Time limit in seconds which the vehicle is stuck before attempting to reverse")
	var stopTimeReverse : float = 1;

	@Tooltip("Duration in seconds the vehicle will reverse after getting stuck")
	var reverseAttemptTime : float = 1;
	
	@Tooltip("How many times the vehicle will attempt reversing before resetting, -1 = no reset")
	var resetReverseCount : int = 1;
	private var reverseAttempts : int;

	@Tooltip("Seconds a vehicle will be rolled over before resetting, -1 = no reset")
	var rollResetTime : float = 3;
	private var rolledOverTime : float;

	function Start()
	{
		tr = transform;
		rb = GetComponent(Rigidbody);
		vp = GetComponent(VehicleParent);
		va = GetComponent(VehicleAssist);
		initialSpeed = speed;
		
		InitializeTarget();
	}

	function FixedUpdate()
	{
		if (target)
		{
			if (target != targetPrev)
			{
				InitializeTarget();
			}

			targetPrev = target;
			
			//Is the target a waypoint?
			targetIsWaypoint = target.GetComponent(VehicleWaypoint);
			//Can I see the target?
			targetVisible = !Physics.Linecast(tr.position, target.position, viewBlockMask);

			if (targetVisible || targetIsWaypoint)
			{
				targetPoint = targetBody ? target.position + targetBody.velocity : target.position;
			}

			if (targetIsWaypoint)
			{
				//if vehicle is close enough to target waypoint, switch to the next one
				if ((tr.position - target.position).sqrMagnitude <= targetWaypoint.radius * targetWaypoint.radius)
				{
					target = targetWaypoint.nextPoint.transform;
					targetWaypoint = targetWaypoint.nextPoint;
					prevSpeed = speed;
					speed = Mathf.Clamp01(targetWaypoint.speed * initialSpeed);
					brakeTime = prevSpeed / speed;
					
					if (brakeTime <= 1)
					{
						brakeTime = 0;
					}
				}
			}
			else
			{
				speed = initialSpeed;
			}

			brakeTime = Mathf.Max(0, brakeTime - Time.fixedDeltaTime);
			//Is the distance to the target less than the follow distance?
			close = (tr.position - target.position).sqrMagnitude <= Mathf.Pow(followDistance, 2) && !targetIsWaypoint;
			dirToTarget = (targetPoint - tr.position).normalized;
			lookDot = Vector3.Dot(vp.forwardDir, dirToTarget);
			steerDot = Vector3.Dot(vp.rightDir, dirToTarget);

			//Attempt to reverse if vehicle is stuck
			stoppedTime = Mathf.Abs(vp.localVelocity.z) < 1 && !close && vp.groundedWheels > 0 ? stoppedTime + Time.fixedDeltaTime : 0;
			
			if ((stoppedTime > stopTimeReverse || (vp.velMag < 1 && lookDot < 0) || (vp.velMag <= 20 && lookDot < -0.8)) && reverseTime == 0)
			{
				reverseTime = reverseAttemptTime;
				reverseAttempts ++;
			}
			
			//Reset if reversed too many times
			if (reverseAttempts > resetReverseCount && resetReverseCount >= 0)
			{
				StartCoroutine(ReverseReset());
			}

			reverseTime = Mathf.Max(0, reverseTime - Time.fixedDeltaTime);

			//Set vehicle inputs
			vp.SetAccel(!close && (lookDot > 0 || vp.localVelocity.z < 5) && vp.groundedWheels > 0 && reverseTime == 0 ? speed : 0);
			vp.SetBrake(reverseTime == 0 && brakeTime == 0 && !(close && vp.localVelocity.z > 0.1f) ? (lookDot < 0.5f && lookDot > 0 && vp.localVelocity.z > 10 ? 0.5f - lookDot : 0) : (brakeTime > 0 ? brakeTime * 0.2f : 1));
			vp.SetSteer(reverseTime == 0 ? Mathf.Abs(Mathf.Pow(steerDot, (tr.position - target.position).sqrMagnitude > 20 ? 1 : 2)) * Mathf.Sign(steerDot) : -Mathf.Sign(steerDot) * (close ? 0 : 1));
			vp.SetEbrake((close && vp.localVelocity.z <= 0.1f) || (lookDot <= 0 && vp.velMag > 20) ? 1 : 0);
		}

		rolledOverTime = va.rolledOver ? rolledOverTime + Time.fixedDeltaTime : 0;

		//Reset if stuck rolled over
		if (rolledOverTime > rollResetTime && rollResetTime >= 0)
		{
			StartCoroutine(ResetRotation());
		}
	}

	function ReverseReset()
	{
		reverseAttempts = 0;
		reverseTime = 0;
		yield new WaitForFixedUpdate();
		tr.position = targetPoint;
		tr.rotation = Quaternion.LookRotation(targetIsWaypoint ? (targetWaypoint.nextPoint.transform.position - targetPoint).normalized : Vector3.forward, GlobalControl.worldUpDir);
		rb.velocity = Vector3.zero;
		rb.angularVelocity = Vector3.zero;
	}

	function ResetRotation()
	{
		yield new WaitForFixedUpdate();
		tr.eulerAngles = new Vector3(0, transform.eulerAngles.y, 0);
		tr.Translate(Vector3.up, Space.World);
		rb.velocity = Vector3.zero;
		rb.angularVelocity = Vector3.zero;
	}
	
	public function InitializeTarget()
	{
		if (target)
		{
			//if target is a vehicle
			targetBody = F.GetTopmostParentComponent(Rigidbody, target) as Rigidbody;
			
			//if target is a waypoint
			targetWaypoint = target.GetComponent(VehicleWaypoint);
			if (targetWaypoint)
			{
				prevSpeed = targetWaypoint.speed;
			}
		}
	}
}