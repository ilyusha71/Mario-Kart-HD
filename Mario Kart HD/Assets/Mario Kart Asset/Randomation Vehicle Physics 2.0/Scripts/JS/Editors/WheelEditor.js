#if UNITY_EDITOR
@CustomEditor(typeof(Wheel))
@CanEditMultipleObjects

public class WheelEditor extends Editor
{
	var isPrefab : boolean = false;
	static var showButtons : boolean = true;
	static var radiusMargin : float = 0;
	static var widthMargin : float = 0;

	public override function OnInspectorGUI()
	{
		var boldFoldout : GUIStyle = new GUIStyle(EditorStyles.foldout);
		boldFoldout.fontStyle = FontStyle.Bold;
		var targetScript : Wheel = target as Wheel;
		var allTargets : Wheel[] = new Wheel[targets.Length];
		isPrefab = PrefabUtility.GetPrefabType(targetScript) == PrefabType.Prefab;

		for (var i : int = 0; i < targets.Length; i++)
		{
			Undo.RecordObject(targets[i], "Wheel Change");
			allTargets[i] = targets[i] as Wheel;
		}

		DrawDefaultInspector();

		if (!isPrefab && targetScript.gameObject.activeInHierarchy)
		{
			showButtons = EditorGUILayout.Foldout(showButtons, "Quick Actions", boldFoldout);
			EditorGUI.indentLevel ++;
			if (showButtons)
			{
				if (GUILayout.Button("Get Wheel Dimensions"))
				{
					for (var curTarget : Wheel in allTargets)
					{
						curTarget.GetWheelDimensions(radiusMargin, widthMargin);
					}
				}

				EditorGUI.indentLevel ++;
				radiusMargin = EditorGUILayout.FloatField("Radius Margin", radiusMargin);
				widthMargin = EditorGUILayout.FloatField("Width Margin", widthMargin);
				EditorGUI.indentLevel --;
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