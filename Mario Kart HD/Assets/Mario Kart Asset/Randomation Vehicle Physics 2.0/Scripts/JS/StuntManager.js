#pragma strict
@DisallowMultipleComponent
@AddComponentMenu("RVP/JS/Stunt/Stunt Manager", 0)

//Class for managing stunts
public class StuntManager extends MonoBehaviour
{
	var driftScoreRate : float;
	static var driftScoreRateStatic : float;

	@Tooltip("Maximum time gap between connected drifts")
	var driftConnectDelay : float;
	static var driftConnectDelayStatic : float;

	var driftBoostAdd : float;
	static var driftBoostAddStatic : float;

	var jumpScoreRate : float;
	static var jumpScoreRateStatic : float;

	var jumpBoostAdd : float;
	static var jumpBoostAddStatic : float;

	var stunts : Stunt[];
	static var stuntsStatic : Stunt[];

	function Start()
	{
		//Set static variables
		driftScoreRateStatic = driftScoreRate;
		driftConnectDelayStatic = driftConnectDelay;
		driftBoostAddStatic = driftBoostAdd;
		jumpScoreRateStatic = jumpScoreRate;
		jumpBoostAddStatic = jumpBoostAdd;
		stuntsStatic = stunts;
	}
}

//Stunt class
@System.Serializable
public class Stunt
{
	var name : String;
	var rotationAxis : Vector3;//Local rotation axis of the stunt
	@RangeAttribute(0, 1)
	var precision : float = 0.8f;//Limit for the dot product between the rotation axis and the stunt axis
	var scoreRate : float;
	var multiplier : float = 1;//Multiplier for when the stunt is performed more than once in the same jump
	var angleThreshold : float;
	@System.NonSerialized
	var progress : float;//How much rotation has happened during the stunt in radians?
	var boostAdd : float;

	//Use this to duplicate a stunt
	public function Stunt(oldStunt : Stunt)
	{
		name = oldStunt.name;
		rotationAxis = oldStunt.rotationAxis;
		precision = oldStunt.precision;
		scoreRate = oldStunt.scoreRate;
		angleThreshold = oldStunt.angleThreshold;
		multiplier = oldStunt.multiplier;
		boostAdd = oldStunt.boostAdd;
	}
}