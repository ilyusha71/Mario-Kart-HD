#if UNITY_EDITOR
@CustomEditor(typeof(VehicleParent))
@CanEditMultipleObjects

public class VehicleParentEditor extends Editor
{
	var isPrefab : boolean = false;
	static var showButtons : boolean = true;
	var wheelMissing : boolean = false;

	public override function OnInspectorGUI()
	{
		var boldFoldout : GUIStyle = new GUIStyle(EditorStyles.foldout);
		boldFoldout.fontStyle = FontStyle.Bold;
		var targetScript : VehicleParent = target as VehicleParent;
		var allTargets : VehicleParent[] = new VehicleParent[targets.Length];
		isPrefab = PrefabUtility.GetPrefabType(targetScript) == PrefabType.Prefab;

		for (var i : int = 0; i < targets.Length; i++)
		{
			Undo.RecordObject(targets[i], "Vehicle Parent Change");
			allTargets[i] = targets[i] as VehicleParent;
		}

		wheelMissing = false;
		if (targetScript.wheelGroups != null)
		{
			if (targetScript.wheelGroups.Length > 0)
			{
				if (targetScript.hover)
				{
					for (var curWheel : HoverWheel in targetScript.hoverWheels)
					{
						var hoverWheelFound : boolean = false;
						for (var curGroup : WheelCheckGroup in targetScript.wheelGroups)
						{
							for (var curWheelInstance : HoverWheel in curGroup.hoverWheels)
							{
								if (curWheel == curWheelInstance)
								{
									hoverWheelFound = true;
								}
							}
						}
						
						if (!hoverWheelFound)
						{
							wheelMissing = true;
							break;
						}
					}
				}
				else
				{
					for (var curWheel : Wheel in targetScript.wheels)
					{
						var WheelFound : boolean = false;
						for (var curGroup : WheelCheckGroup in targetScript.wheelGroups)
						{
							for (var curWheelInstance : Wheel in curGroup.wheels)
							{
								if (curWheel == curWheelInstance)
								{
									WheelFound = true;
								}
							}
						}
						
						if (!WheelFound)
						{
							wheelMissing = true;
							break;
						}
					}
				}
			}
		}

		if (wheelMissing)
		{
			EditorGUILayout.HelpBox("If there is at least one wheel group, all wheels must be part of a group.", MessageType.Error);
		}

		DrawDefaultInspector();

		if (!isPrefab && targetScript.gameObject.activeInHierarchy)
		{
			showButtons = EditorGUILayout.Foldout(showButtons, "Quick Actions", boldFoldout);
			EditorGUI.indentLevel ++;
			if (showButtons)
			{
				if (GUILayout.Button("Get Engine"))
				{
					for (var curTarget : VehicleParent in allTargets)
					{
						curTarget.engine = curTarget.transform.GetComponentInChildren(Motor);
					}
				}

				if (GUILayout.Button("Get Wheels"))
				{
					for (var curTarget : VehicleParent in allTargets)
					{
						if (curTarget.hover)
						{
							var tempHoverWheels : Component[] = curTarget.transform.GetComponentsInChildren(HoverWheel);
							curTarget.hoverWheels = new HoverWheel[tempHoverWheels.length];
							
							for (var h : int = 0; h < tempHoverWheels.length; h++)
							{
								curTarget.hoverWheels[h] = tempHoverWheels[h] as HoverWheel;
							}
						}
						else
						{
							var tempWheels : Component[] = curTarget.transform.GetComponentsInChildren(Wheel);
							curTarget.wheels = new Wheel[tempWheels.length];
							
							for (var w : int = 0; w < tempWheels.length; w++)
							{
								curTarget.wheels[w] = tempWheels[w] as Wheel;
							}
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