#if UNITY_EDITOR
@CustomEditor(typeof(GroundSurfaceInstance))
@CanEditMultipleObjects

public class GroundSurfaceInstanceEditor extends Editor
{
	public override function OnInspectorGUI()
	{
		var surfaceMaster : GroundSurfaceMaster = FindObjectOfType(GroundSurfaceMaster);
		var targetScript : GroundSurfaceInstance = target as GroundSurfaceInstance;
		var allTargets : GroundSurfaceInstance[] = new GroundSurfaceInstance[targets.Length];

		for (var i : int = 0; i < targets.Length; i++)
		{
			Undo.RecordObject(targets[i], "Ground Surface Change");
			allTargets[i] = targets[i] as GroundSurfaceInstance;
		}

		var surfaceNames : String[] = new String[surfaceMaster.surfaceTypes.Length];
		
		for (var j : int = 0; j < surfaceNames.Length; j++)
		{
			surfaceNames[j] = surfaceMaster.surfaceTypes[j].name;
		}

		for (var curTarget : GroundSurfaceInstance in allTargets)
		{
			curTarget.surfaceType = EditorGUILayout.Popup("Surface Type", curTarget.surfaceType, surfaceNames);
		}

		if (GUI.changed)
		{
			EditorUtility.SetDirty(targetScript);
		}
	}
}
#endif