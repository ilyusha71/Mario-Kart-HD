#pragma strict

//Static class with extra gizmo drawing functions
public static class GizmosExtra
{
	//Draws a wire cylinder like DrawWireCube and DrawWireSphere
	//pos = position, dir = direction of the caps, radius = radius, height = height or length
	public function DrawWireCylinder(pos : Vector3, dir : Vector3, radius : float, height : float)
	{
		var halfHeight : float = height * 0.5f;
		var quat : Quaternion = Quaternion.LookRotation(dir, new Vector3(-dir.y, dir.x, 0));

		Gizmos.DrawLine(pos + quat * new Vector3(radius, 0, halfHeight), pos + quat * new Vector3(radius, 0, -halfHeight));
		Gizmos.DrawLine(pos + quat * new Vector3(-radius, 0, halfHeight), pos + quat * new Vector3(-radius, 0, -halfHeight));
		Gizmos.DrawLine(pos + quat * new Vector3(0, radius, halfHeight), pos + quat * new Vector3(0, radius, -halfHeight));
		Gizmos.DrawLine(pos + quat * new Vector3(0, -radius, halfHeight), pos + quat * new Vector3(0, -radius, -halfHeight));

		var circle0Point0 : Vector3;
		var circle0Point1 : Vector3;
		var circle1Point0 : Vector3;
		var circle1Point1 : Vector3;

		for (var i : float = 0; i < 6.28f; i += 0.1f)
		{
			circle0Point0 = pos + quat * new Vector3(Mathf.Sin(i) * radius, Mathf.Cos(i) * radius, halfHeight);
			circle0Point1 = pos + quat * new Vector3(Mathf.Sin(i + 0.1f) * radius, Mathf.Cos(i + 0.1f) * radius, halfHeight);
			Gizmos.DrawLine(circle0Point0, circle0Point1);

			circle1Point0 = pos + quat * new Vector3(Mathf.Sin(i) * radius, Mathf.Cos(i) * radius, -halfHeight);
			circle1Point1 = pos + quat * new Vector3(Mathf.Sin(i + 0.1f) * radius, Mathf.Cos(i + 0.1f) * radius, -halfHeight);
			Gizmos.DrawLine(circle1Point0, circle1Point1);
		}
	}
}
