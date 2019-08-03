#pragma strict
@script RequireComponent(Terrain)
@ExecuteInEditMode
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Ground Surface/Terrain Surface", 2)

//Class for associating terrain textures with ground surface types
public class TerrainSurface extends MonoBehaviour
{
	private var tr : Transform;
	private var terDat : TerrainData;
	private var terrainAlphamap : float[,,];
	var surfaceTypes : int[] = new int[0];
	@System.NonSerialized
	var frictions : float[];

	function Start()
	{
		tr = transform;
		if (GetComponent(Terrain).terrainData)
		{
			terDat = GetComponent(Terrain).terrainData;

			//Set frictions for each surface type
			if (Application.isPlaying)
			{
				UpdateAlphamaps();
				frictions = new float[surfaceTypes.Length];
				for (var i : int = 0; i < frictions.Length; i++)
				{
					if (GroundSurfaceMaster.surfaceTypesStatic[surfaceTypes[i]].useColliderFriction)
					{
						frictions[i] = GetComponent(Collider).material.dynamicFriction * 2;
					}
					else
					{
						frictions[i] = GroundSurfaceMaster.surfaceTypesStatic[surfaceTypes[i]].friction;
					}
				}
			}
		}
	}

	function Update()
	{
		if (!Application.isPlaying)
		{
			if (terDat)
			{
				if (surfaceTypes.Length != terDat.alphamapLayers)
				{
					ChangeSurfaceTypesLength();
				}
			}
		}
	}

	public function UpdateAlphamaps()
	{
		terrainAlphamap = terDat.GetAlphamaps(0, 0, terDat.alphamapWidth, terDat.alphamapHeight);
	}

	function ChangeSurfaceTypesLength()
	{
		var tempVals : int[] = surfaceTypes;

		surfaceTypes = new int[terDat.alphamapLayers];

		for (var i : int = 0; i < surfaceTypes.Length; i++)
		{
			if (i >= tempVals.Length)
			{
				break;
			}
			else
			{
				surfaceTypes[i] = tempVals[i];
			}
		}
	}

	//Returns index of dominant surface type at point on terrain, relative to surface types array in GroundSurfaceMaster
	public function GetDominantSurfaceTypeAtPoint(pos : Vector3) : int
	{
		var coord : Vector2 = new Vector2(Mathf.Clamp01((pos.z - tr.position.z) / terDat.size.z), Mathf.Clamp01((pos.x - tr.position.x) / terDat.size.x));

		var maxVal : float = 0;
		var maxIndex : int = 0;
		var curVal : float = 0;

		for (var i : int = 0; i < terrainAlphamap.GetLength(2); i++)
		{
			curVal = terrainAlphamap[Mathf.FloorToInt(coord.x * (terDat.alphamapWidth - 1)), Mathf.FloorToInt(coord.y * (terDat.alphamapHeight - 1)), i];

			if (curVal > maxVal)
			{
				maxVal = curVal;
				maxIndex = i;
			}
		}

		return surfaceTypes[maxIndex];
	}
	
	//Gets the friction of the indicated surface type
	public function GetFriction(sType : int) : float
	{
		var returnedFriction : float = 1;
		
		for (var i : int = 0; i < surfaceTypes.length; i++)
		{
			if (sType == surfaceTypes[i])
			{
				returnedFriction = frictions[i];
				break;
			}
		}
		
		return returnedFriction;
	}
}
