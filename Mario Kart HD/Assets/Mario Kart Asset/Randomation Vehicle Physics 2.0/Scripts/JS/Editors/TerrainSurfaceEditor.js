#if UNITY_EDITOR
@CustomEditor(typeof(TerrainSurface))

public class TerrainSurfaceEditor extends Editor
{
	var terDat : TerrainData;
	var targetScript : TerrainSurface;
	var surfaceNames : String[];

	public override function OnInspectorGUI()
	{
		var surfaceMaster : GroundSurfaceMaster = FindObjectOfType(GroundSurfaceMaster);
		targetScript = target as TerrainSurface;
		Undo.RecordObject(targetScript, "Terrain Surface Change");

		if (targetScript.GetComponent(Terrain).terrainData)
		{
			terDat = targetScript.GetComponent(Terrain).terrainData;
		}

		EditorGUILayout.LabelField("Textures and Surface Types:", EditorStyles.boldLabel);

		surfaceNames = new String[surfaceMaster.surfaceTypes.Length];

		for (var i : int = 0; i < surfaceNames.Length; i++)
		{
			surfaceNames[i] = surfaceMaster.surfaceTypes[i].name;
		}

		if (targetScript.surfaceTypes.Length > 0)
		{
			for (var j : int = 0; j < targetScript.surfaceTypes.Length; j++)
			{
				DrawTerrainInfo(terDat, j);
			}
		}
		else
		{
			EditorGUI.indentLevel ++;
			EditorGUILayout.LabelField("<No terrain textures found>");
		}

		if (GUI.changed)
		{
			EditorUtility.SetDirty(targetScript);
		}
	}

	function DrawTerrainInfo(ter : TerrainData, index : int)
	{
		EditorGUI.indentLevel = 1;
		targetScript.surfaceTypes[index] = EditorGUILayout.Popup(terDat.splatPrototypes[index].texture.name, targetScript.surfaceTypes[index], surfaceNames);
		EditorGUI.indentLevel ++;
	}
}
#endif