#pragma strict
import UnityEngine.UI;
import UnityEngine.SceneManagement;
@AddComponentMenu("RVP/JS/Demo Scripts/Performance Stats", 1)

//Class for displaying the framerate
public class PerformanceStats extends MonoBehaviour
{
	var fpsText : Text;
	private var fpsUpdateTime : float;
	private var frames : int;
	
	function Update()
	{
		fpsUpdateTime = Mathf.Max(0, fpsUpdateTime - Time.deltaTime);

		if (fpsUpdateTime == 0)
		{
			fpsText.text = "FPS: " + frames.ToString();
			fpsUpdateTime = 1;
			frames = 0;
		}
		else
		{
			frames ++;
		}
	}

	function Restart()
	{
	    SceneManager.LoadScene(SceneManager.GetActiveScene().name);
		Time.timeScale = 1;
	}
}
