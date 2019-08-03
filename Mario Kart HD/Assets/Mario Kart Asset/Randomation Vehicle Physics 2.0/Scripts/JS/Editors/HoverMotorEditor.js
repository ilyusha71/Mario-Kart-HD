#if UNITY_EDITOR
@CustomEditor(typeof(HoverMotor))
@CanEditMultipleObjects

public class HoverMotorEditor extends Editor
{
	var isPrefab : boolean = false;
	static var showButtons : boolean = true;
	var topSpeed : float = 0;

	public override function OnInspectorGUI()
	{
		var boldFoldout : GUIStyle = new GUIStyle(EditorStyles.foldout);
		boldFoldout.fontStyle = FontStyle.Bold;
		var targetScript : HoverMotor = target as HoverMotor;
		var allTargets : HoverMotor[] = new HoverMotor[targets.Length];
		isPrefab = PrefabUtility.GetPrefabType(targetScript) == PrefabType.Prefab;

		for (var i : int = 0; i < targets.Length; i++)
		{
			Undo.RecordObject(targets[i], "Hover Motor Change");
			allTargets[i] = targets[i] as HoverMotor;
		}

		topSpeed = targetScript.forceCurve.keys[targetScript.forceCurve.keys.Length - 1].time;

		if (targetScript.wheels != null)
		{
			if (targetScript.wheels)
			{
				if (targetScript.wheels.Length == 0)
				{
					EditorGUILayout.HelpBox("No wheels are assigned.", MessageType.Warning);
				}
				else if (targets.Length == 1)
				{
					EditorGUILayout.LabelField("Top Speed (Estimate): " + (topSpeed * 2.23694f).ToString("0.00") + " mph || " + (topSpeed * 3.6f).ToString("0.00") + " km/h", EditorStyles.boldLabel);
				}
			}
			else
			{
				EditorGUILayout.HelpBox("No wheels are assigned.", MessageType.Warning);
			}
		}
		else
		{
			EditorGUILayout.HelpBox("No wheels are assigned.", MessageType.Warning);
		}

		DrawDefaultInspector();

		if (!isPrefab && targetScript.gameObject.activeInHierarchy)
		{
			showButtons = EditorGUILayout.Foldout(showButtons, "Quick Actions", boldFoldout);
			EditorGUI.indentLevel ++;
			if (showButtons)
			{
				if (GUILayout.Button("Get Wheels"))
				{
					for (var curTarget : HoverMotor in allTargets)
					{
						var tempHoverWheels : Component[] = (F.GetTopmostParentComponent(VehicleParent, curTarget.transform).transform).GetComponentsInChildren(HoverWheel);
						curTarget.wheels = new HoverWheel[tempHoverWheels.length];
						
						for (var h : int = 0; h < tempHoverWheels.length; h++)
						{
							curTarget.wheels[h] = tempHoverWheels[h] as HoverWheel;
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