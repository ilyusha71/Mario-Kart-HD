#if UNITY_EDITOR
@CustomEditor(typeof(HoverWheel))
@CanEditMultipleObjects

public class HoverWheelEditor extends Editor
{
	var isPrefab : boolean = false;
	static var showButtons : boolean = true;

	public override function OnInspectorGUI()
	{
		var boldFoldout : GUIStyle = new GUIStyle(EditorStyles.foldout);
		boldFoldout.fontStyle = FontStyle.Bold;
		var targetScript : HoverWheel = target as HoverWheel;
		var allTargets : HoverWheel[] = new HoverWheel[targets.Length];
		isPrefab = PrefabUtility.GetPrefabType(targetScript) == PrefabType.Prefab;

		for (var i : int = 0; i < targets.Length; i++)
		{
			Undo.RecordObject(targets[i], "Hover Wheel Change");
			allTargets[i] = targets[i] as HoverWheel;
		}

		DrawDefaultInspector();

		if (!isPrefab && targetScript.gameObject.activeInHierarchy)
		{
			showButtons = EditorGUILayout.Foldout(showButtons, "Quick Actions", boldFoldout);
			EditorGUI.indentLevel ++;
			if (showButtons)
			{
				if (GUILayout.Button("Get Visual Wheel"))
				{
					for (var curTarget : HoverWheel in allTargets)
					{
						if (curTarget.transform.childCount > 0)
						{
							curTarget.visualWheel = curTarget.transform.GetChild(0);
						}
						else
						{
							Debug.LogWarning("No visual wheel found.", this);
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