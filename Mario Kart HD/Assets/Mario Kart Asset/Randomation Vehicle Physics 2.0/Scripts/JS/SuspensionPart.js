#pragma strict
@script ExecuteInEditMode
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Suspension/Suspension Part", 1)

//Class for moving suspension parts
public class SuspensionPart extends MonoBehaviour
{
	private var tr : Transform;
	private var wheel : Wheel;
	var suspension : Suspension ;
	var isHub : boolean;

	@Header("Connections")

	@Tooltip("Object to point at")
	var connectObj : Transform;

	@Tooltip("Local space point to point at in connectObj")
	var connectPoint : Vector3;
	@System.NonSerialized
	var initialConnectPoint : Vector3;
	private var localConnectPoint : Vector3;//Transformed connect point

	@Tooltip("Rotate to point at target?")
	var rotate : boolean = true;
	
	@Tooltip("Scale along local z-axis to reach target?")
	var stretch : boolean;
	private var initialDist : float;
	private var initialScale : Vector3;

	@Header("Solid Axle")

	var solidAxle : boolean;
	var invertRotation : boolean;

	@Tooltip("Does this part connect to a solid axle?")
	var solidAxleConnector : boolean;

	//Wheels for solid axles
	var wheel1 : Wheel;
	var wheel2 : Wheel;
	private var wheelConnect1 : Vector3;
	private var wheelConnect2 : Vector3;

	private var parentUpDir : Vector3;//parent's up direction

	function Start()
	{
		tr = transform;
		initialConnectPoint = connectPoint;

		//Get the wheel
		if (suspension)
		{
			suspension.movingParts.Add(this);
			
			if (suspension.wheel)
			{
				wheel = suspension.wheel;
			}
		}

		//Get the initial distance from the target to use when stretching
		if (connectObj && !isHub && Application.isPlaying)
		{
			initialDist = Mathf.Max(Vector3.Distance(tr.position, connectObj.TransformPoint(connectPoint)), 0.01f);
			initialScale = tr.localScale;
		}
	}

	function Update()
	{
		if (!Application.isPlaying)
		{
			tr = transform;

			//Get the wheel
			if (suspension)
			{
				if (suspension.wheel)
				{
					wheel = suspension.wheel;
				}
			}
		}
		
		if (tr)
		{
			if (!solidAxle && ((suspension && !solidAxleConnector) || solidAxleConnector))
			{
				//Transformations for hubs
				if (isHub && wheel && !solidAxleConnector)
				{
					if (wheel.rim)
					{
						tr.position = wheel.rim.position;
						tr.rotation = Quaternion.LookRotation(wheel.rim.forward, suspension.upDir);
						tr.localEulerAngles = new Vector3(tr.localEulerAngles.x, tr.localEulerAngles.y, -suspension.casterAngle * suspension.flippedSideFactor);
					}
				}
				else if (!isHub && connectObj)
				{
					localConnectPoint = connectObj.TransformPoint(connectPoint);

					//Rotate to look at connection point
					if (rotate)
					{
						tr.rotation = Quaternion.LookRotation((localConnectPoint - tr.position).normalized, (solidAxleConnector ? tr.parent.forward : suspension.upDir));

						//Don't set localEulerAngles if connected to a solid axle
						if (!solidAxleConnector)
						{
							tr.localEulerAngles = new Vector3(tr.localEulerAngles.x, tr.localEulerAngles.y, -suspension.casterAngle * suspension.flippedSideFactor);
						}
					}

					//Stretch like a spring if stretch is true
					if (stretch && Application.isPlaying)
					{
						tr.localScale = new Vector3(tr.localScale.x, tr.localScale.y, initialScale.z * (Vector3.Distance(tr.position, localConnectPoint) / initialDist));
					}
				}
			}
			else if (solidAxle && wheel1 && wheel2)
			{
				//Transformations for solid axles
				if (wheel1.rim && wheel2.rim && wheel1.suspensionParent && wheel2.suspensionParent)
				{
					parentUpDir = tr.parent.up;
					wheelConnect1 = wheel1.rim.TransformPoint(0, 0, -wheel1.suspensionParent.pivotOffset);
					wheelConnect2 = wheel2.rim.TransformPoint(0, 0, -wheel2.suspensionParent.pivotOffset);
					tr.rotation = Quaternion.LookRotation((((wheelConnect1 + wheelConnect2) * 0.5f) - tr.position).normalized, parentUpDir);
					tr.localEulerAngles = new Vector3(tr.localEulerAngles.x, tr.localEulerAngles.y, Vector3.Angle((wheelConnect1 - wheelConnect2).normalized, tr.parent.right) * Mathf.Sign(Vector3.Dot((wheelConnect1 - wheelConnect2).normalized, parentUpDir)) * Mathf.Sign(tr.localPosition.z) * (invertRotation ? -1 : 1));
				}
			}
		}
	}

	function OnDrawGizmosSelected()
	{
		if (!tr)
		{
			tr = transform;
		}

		Gizmos.color = Color.green;

		//Visualize connections
		if (!isHub && connectObj && !solidAxle)
		{
			localConnectPoint = connectObj.TransformPoint(connectPoint);
			Gizmos.DrawLine(tr.position, localConnectPoint);
			Gizmos.DrawWireSphere(localConnectPoint, 0.01f);
		}
		else if (solidAxle && wheel1 && wheel2)
		{
			if (wheel1.rim && wheel2.rim && wheel1.suspensionParent && wheel2.suspensionParent)
			{
				wheelConnect1 = wheel1.rim.TransformPoint(0, 0, -wheel1.suspensionParent.pivotOffset);
				wheelConnect2 = wheel2.rim.TransformPoint(0, 0, -wheel2.suspensionParent.pivotOffset);
				Gizmos.DrawLine(wheelConnect1, wheelConnect2);
				Gizmos.DrawWireSphere(wheelConnect1, 0.01f);
				Gizmos.DrawWireSphere(wheelConnect2, 0.01f);
			}
		}
	}
}