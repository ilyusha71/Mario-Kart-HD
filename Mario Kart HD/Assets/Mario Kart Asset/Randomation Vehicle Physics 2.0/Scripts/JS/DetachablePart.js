#pragma strict
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Damage/Detachable Part", 1)

//Class for parts that can detach
public class DetachablePart extends MonoBehaviour
{
	private var tr : Transform;
	private var rb : Rigidbody;
	private var parentBody : Rigidbody;
	private var initialParent : Transform;
	private var initialLocalPos : Vector3;
	private var initialLocalRot : Quaternion;

	@System.NonSerialized
	var hinge : HingeJoint;
	@System.NonSerialized
	var detached : boolean;
	@System.NonSerialized
	var initialPos : Vector3;
	var mass : float = 0.1f;
	var drag : float;
	var angularDrag : float = 0.05f;
	var looseForce : float = -1;
	var breakForce : float = 25;

	@Tooltip("A hinge joint is randomly chosen from the list to use")
	var joints : PartJoint[];
	private var initialAnchor : Vector3;
	@System.NonSerialized
	var displacedAnchor : Vector3;

	function Start()
	{
		tr = transform;

		if (tr.parent)
		{
			initialParent = tr.parent;
			initialLocalPos = tr.localPosition;
			initialLocalRot = tr.localRotation;
		}

		parentBody = F.GetTopmostParentComponent(Rigidbody, tr) as Rigidbody;
		initialPos = tr.localPosition;
	}

	function Update()
	{
		if (hinge)
		{
			//Destory hinge if displaced too far from original position
			if ((initialAnchor - displacedAnchor).sqrMagnitude > 0.1f)
			{
				Destroy(hinge);
			}
		}
	}
	
	public function Detach(makeJoint : boolean)
	{
		if (!detached)
		{
			detached = true;
			tr.parent = null;
			rb = gameObject.AddComponent(Rigidbody);
			rb.mass = mass;
			rb.drag = drag;
			rb.angularDrag = angularDrag;

			if (parentBody)
			{
				parentBody.mass -= mass;
				rb.velocity = parentBody.GetPointVelocity(tr.position);
				rb.angularVelocity = parentBody.angularVelocity;

				//Pick a random hinge joint to use
				if (makeJoint && joints.Length > 0)
				{
					var chosenJoint : PartJoint = joints[Random.Range(0, joints.Length)];
					initialAnchor = chosenJoint.hingeAnchor;
					displacedAnchor = initialAnchor;
					
					hinge = gameObject.AddComponent(HingeJoint);
					hinge.autoConfigureConnectedAnchor = false;
					hinge.connectedBody = parentBody;
					hinge.anchor = chosenJoint.hingeAnchor;
					hinge.axis = chosenJoint.hingeAxis;
					hinge.connectedAnchor = initialPos + chosenJoint.hingeAnchor;
					hinge.enableCollision = false;
					hinge.useLimits = chosenJoint.useLimits;
					
					var limits : JointLimits = new JointLimits();
					limits.min = chosenJoint.minLimit;
					limits.max = chosenJoint.maxLimit;
					limits.bounciness = chosenJoint.bounciness;
					hinge.limits = limits;
					hinge.useSpring = chosenJoint.useSpring;
					
					var spring : JointSpring = new JointSpring();
					spring.targetPosition = chosenJoint.springTargetPosition;
					spring.spring = chosenJoint.springForce;
					spring.damper = chosenJoint.springDamper;
					hinge.spring = spring;
					hinge.breakForce = breakForce;
					hinge.breakTorque = breakForce;
				}
			}
		}
	}
	
	public function Reattach()
	{
		if (detached)
		{
			detached = false;
			tr.parent = initialParent;
			tr.localPosition = initialLocalPos;
			tr.localRotation = initialLocalRot;

			if (parentBody)
			{
				parentBody.mass += mass;
			}
			
			if (hinge)
			{
				Destroy(hinge);
			}

			if (rb)
			{
				Destroy(rb);
			}
		}
	}

	//Draw joint gizmos
	function OnDrawGizmosSelected()
	{
		if (!tr)
		{
			tr = transform;
		}

		if (looseForce >= 0 && joints.Length > 0)
		{
			Gizmos.color = Color.red;
			for (var curJoint : PartJoint in joints)
			{
				Gizmos.DrawRay(tr.TransformPoint(curJoint.hingeAnchor), tr.TransformDirection(curJoint.hingeAxis).normalized * 0.2f);
				Gizmos.DrawWireSphere(tr.TransformPoint(curJoint.hingeAnchor), 0.02f);
			}
		}
	}
}

//Class for storing hinge joint information in the joints list
@System.Serializable
public class PartJoint
{
	var hingeAnchor : Vector3;
	var hingeAxis : Vector3 = Vector3.right;
	var useLimits : boolean;
	var minLimit : float;
	var maxLimit : float;
	var bounciness : float;
	var useSpring : boolean;
	var springTargetPosition : float;
	var springForce : float;
	var springDamper : float;
}