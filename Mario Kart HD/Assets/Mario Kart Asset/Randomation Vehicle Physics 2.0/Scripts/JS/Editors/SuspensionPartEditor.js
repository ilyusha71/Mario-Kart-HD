#if UNITY_EDITOR
@CustomEditor(typeof(SuspensionPart))
@CanEditMultipleObjects

public class SuspensionPartEditor extends Editor
{
	static var showHandles : boolean = true;
	
	public override function OnInspectorGUI()
	{
		showHandles = EditorGUILayout.Toggle("Show Handles", showHandles);
		SceneView.RepaintAll();
		
		DrawDefaultInspector();
	}

	public function OnSceneGUI()
	{
		var targetScript : SuspensionPart = target as SuspensionPart;
		Undo.RecordObject(targetScript, "Suspension Part Change");

		if (showHandles && targetScript.gameObject.activeInHierarchy)
		{
			if (targetScript.connectObj && !targetScript.isHub && !targetScript.solidAxle && Tools.current == Tool.Move)
			{
				targetScript.connectPoint = targetScript.connectObj.InverseTransformPoint(Handles.PositionHandle(targetScript.connectObj.TransformPoint(targetScript.connectPoint), Tools.pivotRotation == PivotRotation.Local ? targetScript.connectObj.rotation : Quaternion.identity));
			}
		}

		if (GUI.changed)
		{
			EditorUtility.SetDirty(targetScript);
		}
	}
}
#endif