#if UNITY_EDITOR
@CustomEditor(typeof(PropertyToggleSetter))
@CanEditMultipleObjects

public class PropertyToggleSetterEditor extends Editor
{
	var isPrefab : boolean = false;
	static var showButtons : boolean = true;

	public override function OnInspectorGUI()
	{
		var boldFoldout : GUIStyle = new GUIStyle(EditorStyles.foldout);
		boldFoldout.fontStyle = FontStyle.Bold;
		var targetScript : PropertyToggleSetter = target as PropertyToggleSetter;
		var allTargets : PropertyToggleSetter[] = new PropertyToggleSetter[targets.Length];
		isPrefab = PrefabUtility.GetPrefabType(targetScript) == PrefabType.Prefab;

		for (var i : int = 0; i < targets.Length; i++)
		{
			Undo.RecordObject(targets[i], "Property Toggle Setter Change");
			allTargets[i] = targets[i] as PropertyToggleSetter;
		}

		DrawDefaultInspector();

		if (!isPrefab && targetScript.gameObject.activeInHierarchy)
		{
			showButtons = EditorGUILayout.Foldout(showButtons, "Quick Actions", boldFoldout);
			EditorGUI.indentLevel ++;
			if (showButtons)
			{
				if (GUILayout.Button("Get Variables"))
				{
					for (var curTarget : PropertyToggleSetter in allTargets)
					{
						curTarget.steerer = curTarget.GetComponentInChildren(SteeringControl);
						curTarget.transmission = curTarget.GetComponentInChildren(Transmission);
						
						var tempSus : Component[] = curTarget.GetComponentsInChildren(SuspensionPropertyToggle);
						curTarget.suspensionProperties = new SuspensionPropertyToggle[tempSus.length];
						
						for (var s : int = 0; s < tempSus.length; s++)
						{
							curTarget.suspensionProperties[s] = tempSus[s] as SuspensionPropertyToggle;
						}
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