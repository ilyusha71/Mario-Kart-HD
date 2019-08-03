#pragma strict
@script RequireComponent(Renderer)
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Damage/Shatter Part", 2)

//Class for parts that shatter
public class ShatterPart extends MonoBehaviour
{
	@System.NonSerialized
	var rend : Renderer;
	@System.NonSerialized
	var shattered : boolean;
	var breakForce : float = 5;

	@Tooltip("Transform used for maintaining seams when deformed after shattering")
	var seamKeeper : Transform;
	@System.NonSerialized
	var initialMat : Material;
	var brokenMaterial : Material;
	var shatterParticles : ParticleSystem;
	var shatterSnd : AudioSource;

	function Start()
	{
		rend = GetComponent(Renderer);
		if (rend)
		{
			initialMat = rend.sharedMaterial;
		}
	}
	
	public function Shatter()
	{
		if (!shattered)
		{
			shattered = true;
			
			if (shatterParticles)
			{
				shatterParticles.Play();
			}

			if (brokenMaterial)
			{
				rend.sharedMaterial = brokenMaterial;
			}
			else
			{
				rend.enabled = false;
			}

			if (shatterSnd)
			{
				shatterSnd.Play();
			}
		}
	}
}