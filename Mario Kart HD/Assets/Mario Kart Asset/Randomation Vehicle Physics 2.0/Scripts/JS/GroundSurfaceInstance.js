#pragma strict
@RequireComponent(Collider)
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Ground Surface/Ground Surface Instance", 1)

//Class for instances of surface types
public class GroundSurfaceInstance extends MonoBehaviour
{
	@Tooltip("Which surface type to use from the GroundSurfaceMaster list of surface types")
	var surfaceType : int;
	@System.NonSerialized
	var friction : float;

	function Start()
	{
		//Set friction
		if (GroundSurfaceMaster.surfaceTypesStatic[surfaceType].useColliderFriction)
		{
			friction = GetComponent(Collider).material.dynamicFriction * 2;
		}
		else
		{
			friction = GroundSurfaceMaster.surfaceTypesStatic[surfaceType].friction;
		}
	}
}
