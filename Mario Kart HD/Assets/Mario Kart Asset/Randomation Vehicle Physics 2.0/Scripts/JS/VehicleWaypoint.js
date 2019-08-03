#pragma strict
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/AI/Vehicle Waypoint", 1)

//Class for vehicle waypoints
public class VehicleWaypoint extends MonoBehaviour
{
	var nextPoint : VehicleWaypoint;
	var radius : float = 10;

	@Tooltip("Percentage of a vehicle's max speed to drive at")
	@RangeAttribute(0, 1)
	var speed : float = 1;

	function OnDrawGizmos()
	{
		//Visualize waypoint
		Gizmos.color = Color.yellow;
		Gizmos.DrawWireSphere(transform.position, radius);

		//Draw line to next point
		if (nextPoint)
		{
			Gizmos.color = Color.magenta;
			Gizmos.DrawLine(transform.position, nextPoint.transform.position);
		}
	}
}
