#if UNITY_EDITOR
@CustomEditor(typeof(GearboxTransmission))
@CanEditMultipleObjects

public class GearboxTransmissionEditor extends Editor
{
	var isPrefab : boolean = false;
	static var showButtons : boolean = true;

	public override function OnInspectorGUI()
	{
		var boldFoldout : GUIStyle = new GUIStyle(EditorStyles.foldout);
		boldFoldout.fontStyle = FontStyle.Bold;
		var targetScript : GearboxTransmission = target as GearboxTransmission;
		var allTargets : GearboxTransmission[] = new GearboxTransmission[targets.Length];
		isPrefab = PrefabUtility.GetPrefabType(targetScript) == PrefabType.Prefab;

		for (var i : int = 0; i < targets.Length; i++)
		{
			Undo.RecordObject(targets[i], "Transmission Change");
			allTargets[i] = targets[i] as GearboxTransmission;
		}

		DrawDefaultInspector();

		if (!isPrefab && targetScript.gameObject.activeInHierarchy)
		{
			showButtons = EditorGUILayout.Foldout(showButtons, "Quick Actions", boldFoldout);
			EditorGUI.indentLevel ++;
			if (showButtons)
			{
				if (GUILayout.Button("Calculate RPM Ranges"))
				{
					for (var curTarget : GearboxTransmission in allTargets)
					{
						curTarget.CalculateRpmRanges();
					}
				}
			}
			EditorGUI.indentLevel --;
		}

		if (GUI.changed)
		{
			EditorUtility.SetDirty(targetScript);
		}
	}
}
#endif