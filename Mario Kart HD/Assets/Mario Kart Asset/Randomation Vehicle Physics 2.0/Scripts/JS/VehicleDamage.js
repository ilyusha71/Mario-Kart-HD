#pragma strict
@script RequireComponent(VehicleParent)
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Damage/Vehicle Damage", 0)

//Class for damaging vehicles
public class VehicleDamage extends MonoBehaviour
{
	private var tr : Transform;
	private var rb : Rigidbody;
	private var vp : VehicleParent;

	@RangeAttribute(0, 1)
	var strength : float = 1;
	var damageFactor : float = 1;

	var maxCollisionMagnitude : float = 100;
	
	@Tooltip("Maximum collision points to use when deforming, has large effect on performance")
	var maxCollisionPoints : int = 2;

	@Tooltip("Collisions underneath this local y-position will be ignored")
	var collisionIgnoreHeight : float;

	@Tooltip("If true, grounded wheels will not be damaged, but can still be displaced")
	var ignoreGroundedWheels : boolean;

	@Tooltip("Minimum time in seconds between collisions")
	var collisionTimeGap : float = 0.1f;
	private var hitTime : float;

	@Tooltip("Whether the edges of adjacent deforming parts should match")
	var seamlessDeform : boolean;

	@Tooltip("Add some perlin noise to deformation")
	var usePerlinNoise : boolean = true;

	@Tooltip("Recalculate normals of deformed meshes")
	var calculateNormals : boolean = true;

	@Tooltip("Parts that are damaged")
	var damageParts : Transform[];

	@Tooltip("Meshes that are deformed")
	var deformMeshes : MeshFilter[];
	private var damagedMeshes : boolean[];
	private var tempMeshes : Mesh[];
	private var meshVertices : meshVerts[];

	@Tooltip("Mesh colliders that are deformed (Poor performance, must be convex)")
	var deformColliders : MeshCollider[];
	private var damagedCols : boolean[];
	private var tempCols : Mesh[];
	private var colVertices : meshVerts[];

	@Tooltip("Parts that are displaced")
	var displaceParts : Transform[];
	private var initialPartPositions : Vector3[];
	
	private var nullContact : ContactPoint = new ContactPoint();

	function Start()
	{
		tr = transform;
		rb = GetComponent(Rigidbody);
		vp = GetComponent(VehicleParent);

		//Tell VehicleParent not to play crashing sounds because this script takes care of it
		vp.playCrashSounds = false;
		vp.playCrashSparks = false;

		//Set up mesh data
		tempMeshes = new Mesh[deformMeshes.Length];
		damagedMeshes = new boolean[deformMeshes.Length];
		meshVertices = new meshVerts[deformMeshes.Length];
		for (var i : int = 0; i < deformMeshes.Length; i++)
		{
			tempMeshes[i] = deformMeshes[i].mesh;
			meshVertices[i] = new meshVerts();
			meshVertices[i].verts = deformMeshes[i].mesh.vertices;
			meshVertices[i].initialVerts = deformMeshes[i].mesh.vertices;
			damagedMeshes[i] = false;
		}

		//Set up mesh collider data
		tempCols = new Mesh[deformColliders.Length];
		damagedCols = new boolean[deformColliders.Length];
		colVertices = new meshVerts[deformColliders.Length];
		for (var j : int = 0; j < deformColliders.Length; j++)
		{
			tempCols[j] = Instantiate(deformColliders[j].sharedMesh) as Mesh;
			colVertices[j] = new meshVerts();
			colVertices[j].verts = deformColliders[j].sharedMesh.vertices;
			colVertices[j].initialVerts = deformColliders[j].sharedMesh.vertices;
			damagedCols[j] = false;
		}

		//Set initial positions for displaced parts
		initialPartPositions = new Vector3[displaceParts.Length];
		for (var k : int = 0; k < displaceParts.Length; k++)
		{
			initialPartPositions[k] = displaceParts[k].localPosition;
		}
	}

	function FixedUpdate()
	{
		//Decrease timer for collisionTimeGap
		hitTime = Mathf.Max(0, hitTime - Time.fixedDeltaTime);
		//Make sure damageFactor is not negative
		damageFactor = Mathf.Max(0, damageFactor);
	}

	//Apply damage on collision
	function OnCollisionEnter(col : Collision)
	{
		if (hitTime == 0 && col.relativeVelocity.sqrMagnitude * damageFactor > 1 && strength < 1)
		{
			var normalizedVel : Vector3 = col.relativeVelocity.normalized;
			var colsChecked : int = 0;
			var soundPlayed : boolean = false;
			var sparkPlayed : boolean = false;
			hitTime = collisionTimeGap;

			for (var curCol : ContactPoint in col.contacts)
			{
				if (tr.InverseTransformPoint(curCol.point).y > collisionIgnoreHeight && GlobalControl.damageMaskStatic.value == (GlobalControl.damageMaskStatic.value | (1 << curCol.otherCollider.gameObject.layer)))
				{
					colsChecked ++;

					//Play crash sound
					if (vp.crashSnd && vp.crashClips.Length > 0 && !soundPlayed)
					{
						vp.crashSnd.PlayOneShot(vp.crashClips[Random.Range(0, vp.crashClips.Length)], Mathf.Clamp01(col.relativeVelocity.magnitude * 0.1f));
						soundPlayed = true;
					}

					//Play crash sparks
					if (vp.sparks && !sparkPlayed)
					{
						vp.sparks.transform.position = curCol.point;
						vp.sparks.transform.rotation = Quaternion.LookRotation(normalizedVel, curCol.normal);
						vp.sparks.Play();
						sparkPlayed = true;
					}

					DamageApplication(curCol.point, col.relativeVelocity, maxCollisionMagnitude, curCol.normal, curCol, true);
				}

				//Stop checking collision points when limit reached
				if (colsChecked >= maxCollisionPoints)
				{
					break;
				}
	        }

	        FinalizeDamage();
		}
	}

	//Damage application from collision contact point
	public function ApplyDamage(colPoint : ContactPoint, colVel : Vector3)
	{
		DamageApplication(colPoint.point, colVel, Mathf.Infinity, colPoint.normal, colPoint, true);
		FinalizeDamage();
	}

	//Same as above, but with extra float for clamping collision force
	public function ApplyDamage(colPoint : ContactPoint, colVel : Vector3, damageForceLimit : float)
	{
		DamageApplication(colPoint.point, colVel, damageForceLimit, colPoint.normal, colPoint, true);
		FinalizeDamage();
	}

	//Damage application from source other than collisions, e.g., an explosion
	public function ApplyDamage(damagePoint : Vector3, damageForce : Vector3)
	{
		DamageApplication(damagePoint, damageForce, Mathf.Infinity, damageForce.normalized, nullContact, false);
		FinalizeDamage();
	}

	//Same as above, but with extra float for clamping damage force
	public function ApplyDamage(damagePoint : Vector3, damageForce : Vector3, damageForceLimit : float)
	{
		DamageApplication(damagePoint, damageForce, damageForceLimit, damageForce.normalized, nullContact, false);
		FinalizeDamage();
	}

	//Damage application from array of points
	public function ApplyDamage(damagePoints : Vector3[], damageForce : Vector3)
	{
		for (var curDamagePoint : Vector3 in damagePoints)
		{
			DamageApplication(curDamagePoint, damageForce, Mathf.Infinity, damageForce.normalized, nullContact, false);
		}

		FinalizeDamage();
	}

	//Damage application from array of points, but with extra float for clamping damage force
	public function ApplyDamage(damagePoints : Vector3[], damageForce : Vector3, damageForceLimit : float)
	{
		for (var curDamagePoint : Vector3 in damagePoints)
		{
			DamageApplication(curDamagePoint, damageForce, damageForceLimit, damageForce.normalized, nullContact, false);
		}

		FinalizeDamage();
	}

	//Where the damage is actually applied
	function DamageApplication(damagePoint : Vector3, damageForce : Vector3, damageForceLimit : float, surfaceNormal : Vector3, colPoint : ContactPoint, useContactPoint : boolean)
	{
		var colMag : float = Mathf.Min(damageForce.magnitude, maxCollisionMagnitude) * (1 - strength) * damageFactor;//Magnitude of collision
		var clampedColMag : float = Mathf.Pow(Mathf.Sqrt(colMag) * 0.5f, 1.5f);//Clamped magnitude of collision
		var clampedVel : Vector3 = Vector3.ClampMagnitude(damageForce, damageForceLimit);//Clamped velocity of collision
		var normalizedVel : Vector3 = damageForce.normalized;
		var surfaceDot : float;//Dot production of collision velocity and surface normal
		var massFactor : float = 1;//Multiplier for damage based on mass of other rigidbody
		var curDamagePart : Transform;
		var damagePartFactor : float;
		var curDamageMesh : MeshFilter;
		var curDisplacePart : Transform;
		var seamKeeper : Transform = null;//Transform for maintaining seams on shattered parts
		var seamLocalPoint : Vector3;
		var vertProjection : Vector3;
		var translation : Vector3;
		var clampedTranslation : Vector3;
		var localPos : Vector3;
		var vertDist : float;
		var distClamp : float;
		var detachedPart : DetachablePart;
		var damagedSus : Suspension;

		//Get mass factor for multiplying damage
		if (useContactPoint)
		{
			damagePoint = colPoint.point;
			surfaceNormal = colPoint.normal;

			if (colPoint.otherCollider.attachedRigidbody)
			{
				massFactor = Mathf.Clamp01(colPoint.otherCollider.attachedRigidbody.mass / rb.mass);
			}
		}
		
		surfaceDot = Mathf.Clamp01(Vector3.Dot(surfaceNormal, normalizedVel)) * (Vector3.Dot((tr.position - damagePoint).normalized, normalizedVel) + 1) * 0.5f;
		
		//Damage damageable parts
		for (var i : int = 0; i < damageParts.Length; i++)
		{
			curDamagePart = damageParts[i];
			damagePartFactor = colMag * surfaceDot * massFactor * Mathf.Min(clampedColMag * 0.01f, (clampedColMag * 0.001f) / Mathf.Pow(Vector3.Distance(curDamagePart.position, damagePoint), clampedColMag));
			
			//Damage motors
			var damagedMotor : Motor = curDamagePart.GetComponent(Motor);
			if (damagedMotor)
			{
				damagedMotor.health -= damagePartFactor * (1 - damagedMotor.strength);
			}
			
			//Damage transmissions
			var damagedTransmission : Transmission = curDamagePart.GetComponent(Transmission);
			if (damagedTransmission)
			{
				damagedTransmission.health -= damagePartFactor * (1 - damagedTransmission.strength);
			}
		}
		
		//Deform meshes
		for (var j : int = 0; j < deformMeshes.Length; j++)
		{
			curDamageMesh = deformMeshes[j];
			localPos = curDamageMesh.transform.InverseTransformPoint(damagePoint);
			translation = curDamageMesh.transform.InverseTransformDirection(clampedVel);
			clampedTranslation = Vector3.ClampMagnitude(translation, clampedColMag);
			
			//Shatter parts that can shatter
			var shattered : ShatterPart = curDamageMesh.GetComponent(ShatterPart);
			if (shattered)
			{
				seamKeeper = shattered.seamKeeper;
				if (Vector3.Distance(curDamageMesh.transform.position, damagePoint) < colMag * surfaceDot * 0.1f * massFactor && colMag * surfaceDot * massFactor > shattered.breakForce)
				{
					shattered.Shatter();
				}
			}
			
			//Actual deformation
			if (translation.sqrMagnitude > 0 && strength < 1)
			{
				for (var k : int = 0; k < meshVertices[j].verts.Length; k++)
				{
					vertDist = Vector3.Distance(meshVertices[j].verts[k], localPos);
					distClamp = (clampedColMag * 0.001f) / Mathf.Pow(vertDist, clampedColMag);
					
					if (distClamp > 0.001f)
					{
						damagedMeshes[j] = true;
						if (seamKeeper == null || seamlessDeform)
						{
							vertProjection = seamlessDeform ? Vector3.zero : Vector3.Project(normalizedVel, meshVertices[j].verts[k]);
							meshVertices[j].verts[k] += (clampedTranslation - vertProjection * (usePerlinNoise ? 1 + Mathf.PerlinNoise(meshVertices[j].verts[k].x * 100, meshVertices[j].verts[k].y * 100) : 1)) * surfaceDot * Mathf.Min(clampedColMag * 0.01f, distClamp) * massFactor;
						}
						else
						{
							seamLocalPoint = seamKeeper.InverseTransformPoint(curDamageMesh.transform.TransformPoint(meshVertices[j].verts[k]));
							meshVertices[j].verts[k] += (clampedTranslation - Vector3.Project(normalizedVel, seamLocalPoint) * (usePerlinNoise ? 1 + Mathf.PerlinNoise(seamLocalPoint.x * 100, seamLocalPoint.y * 100) : 1)) * surfaceDot * Mathf.Min(clampedColMag * 0.01f, distClamp) * massFactor;
						}
					}
				}
			}
		}
		
		seamKeeper = null;
		
		//Deform mesh colliders
		for (var l : int = 0; l < deformColliders.Length; l++)
		{	
			localPos = deformColliders[l].transform.InverseTransformPoint(damagePoint);
			translation = deformColliders[l].transform.InverseTransformDirection(clampedVel);
			clampedTranslation = Vector3.ClampMagnitude(translation, clampedColMag);
			
			if (translation.sqrMagnitude > 0 && strength < 1)
			{
				for (var m : int = 0; m < colVertices[m].verts.Length; m++)
				{
					vertDist = Vector3.Distance(colVertices[l].verts[m], localPos);
					distClamp = (clampedColMag * 0.001f) / Mathf.Pow(vertDist, clampedColMag);
					
					if (distClamp > 0.001f)
					{
						damagedCols[l] = true;
						colVertices[l].verts[m] += clampedTranslation * surfaceDot * Mathf.Min(clampedColMag * 0.01f, distClamp) * massFactor;
					}
				}
			}
		}
		
		
		//Displace parts
		for (var n : int = 0; n < displaceParts.Length; n++)
		{
			curDisplacePart = displaceParts[n];
			translation = clampedVel;
			clampedTranslation = Vector3.ClampMagnitude(translation, clampedColMag);
			
			if (translation.sqrMagnitude > 0 && strength < 1)
			{
				vertDist = Vector3.Distance(curDisplacePart.position, damagePoint);
				distClamp = (clampedColMag * 0.001f) / Mathf.Pow(vertDist, clampedColMag);
				
				if (distClamp > 0.001f)
				{
					curDisplacePart.position += clampedTranslation * surfaceDot * Mathf.Min(clampedColMag * 0.01f, distClamp) * massFactor;
					
					//Detach detachable parts
					if (curDisplacePart.GetComponent(DetachablePart))
					{
						detachedPart = curDisplacePart.GetComponent(DetachablePart);
						
						if (colMag * surfaceDot * massFactor > detachedPart.looseForce && detachedPart.looseForce >= 0)
						{
							detachedPart.initialPos = curDisplacePart.localPosition;
							detachedPart.Detach(true);
						}
						else if (colMag * surfaceDot * massFactor > detachedPart.breakForce)
						{
							detachedPart.Detach(false);
						}
					}
					//Maybe the parent of this part is what actually detaches, useful for displacing compound colliders that represent single detachable objects
					else if (curDisplacePart.parent.GetComponent(DetachablePart))
					{
						detachedPart = curDisplacePart.parent.GetComponent(DetachablePart);
						
						if (!detachedPart.detached)
						{
							if (colMag * surfaceDot * massFactor > detachedPart.looseForce && detachedPart.looseForce >= 0)
							{
								detachedPart.initialPos = curDisplacePart.parent.localPosition;
								detachedPart.Detach(true);
							}
							else if (colMag * surfaceDot * massFactor > detachedPart.breakForce)
							{
								detachedPart.Detach(false);
							}
						}
						else if (detachedPart.hinge)
						{
							detachedPart.displacedAnchor += curDisplacePart.parent.InverseTransformDirection(clampedTranslation * surfaceDot * Mathf.Min(clampedColMag * 0.01f, distClamp) * massFactor);
						}
					}
					
					//Damage suspensions and wheels
					damagedSus = curDisplacePart.GetComponent(Suspension);
					if (damagedSus)
					{
						if ((!damagedSus.wheel.grounded && ignoreGroundedWheels) || !ignoreGroundedWheels)
						{
							curDisplacePart.RotateAround(damagedSus.tr.TransformPoint(damagedSus.damagePivot), Vector3.ProjectOnPlane(damagePoint - curDisplacePart.position, -translation.normalized), clampedColMag * surfaceDot * distClamp * 20 * massFactor);
							
							damagedSus.wheel.damage += clampedColMag * surfaceDot * distClamp * 10 * massFactor;
							
							if (clampedColMag * surfaceDot * distClamp * 10 * massFactor > damagedSus.jamForce)
							{
								damagedSus.jammed = true;
							}
							
							if (clampedColMag * surfaceDot * distClamp * 10 * massFactor > damagedSus.wheel.detachForce)
							{
								damagedSus.wheel.Detach();
							}
							
							for (var curPart : SuspensionPart in damagedSus.movingParts)
							{
								if (curPart.connectObj && !curPart.isHub && !curPart.solidAxle)
								{
									if (!curPart.connectObj.GetComponent(SuspensionPart))
									{
										curPart.connectPoint += curPart.connectObj.InverseTransformDirection(clampedTranslation * surfaceDot * Mathf.Min(clampedColMag * 0.01f, distClamp) * massFactor);
									}
								}
							}
						}
					}
					
					//Damage hover wheels
					var damagedHoverWheel : HoverWheel = curDisplacePart.GetComponent(HoverWheel);
					if (damagedHoverWheel)
					{
						if ((!damagedHoverWheel.grounded && ignoreGroundedWheels) || !ignoreGroundedWheels)
						{
							if (clampedColMag * surfaceDot * distClamp * 10 * massFactor > damagedHoverWheel.detachForce)
							{
								damagedHoverWheel.Detach();
							}
						}
					}
				}
			}
		}
	}

	//Apply damage to meshes
	function FinalizeDamage()
	{
		//Apply vertices to actual meshes
		for (var i : int = 0; i < deformMeshes.Length; i++)
		{
			if (damagedMeshes[i])
			{
				tempMeshes[i].vertices = meshVertices[i].verts;
				
				if (calculateNormals)
				{
					tempMeshes[i].RecalculateNormals();
				}
				
				tempMeshes[i].RecalculateBounds();
			}
			
			damagedMeshes[i] = false;
		}
		
		//Apply vertices to actual mesh colliders
		for (var j : int = 0; j < deformColliders.Length; j++)
		{
			if (damagedCols[j])
			{
				tempCols[j].vertices = colVertices[j].verts;
				deformColliders[j].sharedMesh = null;
				deformColliders[j].sharedMesh = tempCols[j];
			}
			
			damagedCols[j] = false;
		}
	}
	
	public function Repair()
	{
		//Fix damaged parts
		for (var i : int = 0; i < damageParts.Length; i++)
		{
			if (damageParts[i].GetComponent(Motor))
			{
				damageParts[i].GetComponent(Motor).health = 1;
			}

			if (damageParts[i].GetComponent(Transmission))
			{
				damageParts[i].GetComponent(Transmission).health = 1;
			}
		}

		//Restore deformed meshes
		for (var j : int = 0; j < deformMeshes.Length; j++)
		{
			for (var k : int = 0; k < meshVertices[j].verts.Length; k++)
			{
				meshVertices[j].verts[k] = meshVertices[j].initialVerts[k];
			}

			tempMeshes[j].vertices = meshVertices[j].verts;
			tempMeshes[j].RecalculateNormals();
			tempMeshes[j].RecalculateBounds();

			//Fix shattered parts
			var fixedShatter : ShatterPart = deformMeshes[j].GetComponent(ShatterPart);
			if (fixedShatter)
			{
				fixedShatter.shattered = false;

				if (fixedShatter.brokenMaterial)
				{
					fixedShatter.rend.sharedMaterial = fixedShatter.initialMat;
				}
				else
				{
					fixedShatter.rend.enabled = true;
				}
			}
		}

		//Restore deformed mesh colliders
		for (var l : int = 0; l < deformColliders.Length; l++)
		{	
			for (var m : int = 0; m < colVertices[l].verts.Length; m++)
			{
				colVertices[l].verts[m] = colVertices[l].initialVerts[m];
			}

			tempCols[l].vertices = colVertices[l].verts;
			deformColliders[l].sharedMesh = null;
			deformColliders[l].sharedMesh = tempCols[l];
		}

		//Fix displaced parts
		var fixedSus : Suspension;
		var curDisplacePart : Transform;
		for (var n : int = 0; n < displaceParts.Length; n++)
		{
			curDisplacePart = displaceParts[n];
			curDisplacePart.localPosition = initialPartPositions[n];

			if (curDisplacePart.GetComponent(DetachablePart))
			{
				curDisplacePart.GetComponent(DetachablePart).Reattach();
			}
			else if (curDisplacePart.parent.GetComponent(DetachablePart))
			{
				curDisplacePart.parent.GetComponent(DetachablePart).Reattach();
			}

			fixedSus = curDisplacePart.GetComponent(Suspension);
			if (fixedSus)
			{
				curDisplacePart.localRotation = fixedSus.initialRotation;
				fixedSus.jammed = false;

				for (var curPart : SuspensionPart in fixedSus.movingParts)
				{
					if (curPart.connectObj && !curPart.isHub && !curPart.solidAxle)
					{
						if (!curPart.connectObj.GetComponent(SuspensionPart))
						{
							curPart.connectPoint = curPart.initialConnectPoint;
						}
					}
				}
			}
		}

		//Fix wheels
		for (var curWheel : Wheel in vp.wheels)
		{
			curWheel.Reattach();
			curWheel.FixTire();
			curWheel.damage = 0;
		}

		//Fix hover wheels
		for (var curHoverWheel : HoverWheel in vp.hoverWheels)
		{
			curHoverWheel.Reattach();
		}
	}

	//Draw collisionIgnoreHeight gizmos
	function OnDrawGizmosSelected()
	{
		var startPoint : Vector3 = transform.TransformPoint(Vector3.up * collisionIgnoreHeight);
		Gizmos.color = Color.red;
		Gizmos.DrawRay(startPoint, transform.forward);
		Gizmos.DrawRay(startPoint, -transform.forward);
		Gizmos.DrawRay(startPoint, transform.right);
		Gizmos.DrawRay(startPoint, -transform.right);
	}

	//Destroy loose parts
	function OnDestroy()
	{
		for (var curPart : Transform in displaceParts)
		{
			if (curPart)
			{
				if (curPart.GetComponent(DetachablePart) && curPart.parent == null)
				{
					Destroy(curPart.gameObject);
				}
				else if (curPart.parent.GetComponent(DetachablePart) && curPart.parent.parent == null)
				{
					Destroy(curPart.parent.gameObject);
				}
			}
		}
	}
}

//Class for easier mesh data manipulation
class meshVerts
{
	var verts : Vector3[];//Current mesh vertices
	var initialVerts : Vector3[];//Original mesh vertices
}