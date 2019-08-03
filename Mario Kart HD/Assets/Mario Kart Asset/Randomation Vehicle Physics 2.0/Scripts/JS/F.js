#pragma strict
import System.Collections.Generic;

//Static class with extra functions
public static class F
{
	//Returns the number with the greatest absolute value
	//There are multiple constructors for varying numbers of parameters, only 1-3 are supported here
	public function MaxAbs(n : float) : float
	{
		return n;
	}
	
	public function MaxAbs(n0 : float, n1 : float) : float
	{
		var result : float;
		
		if (Mathf.Abs(n0) > Mathf.Abs(n1))
		{
			result = n0;
		}
		else
		{
			result = n1;
		}
		
		return result;
	}
	
	public function MaxAbs(n0 : float, n1 : float, n2 : float) : float
	{
		var result : float;
		
		if (Mathf.Abs(n0) > Mathf.Abs(n1) && Mathf.Abs(n0) > Mathf.Abs(n2))
		{
			result = n0;
		}
		else if (Mathf.Abs(n1) > Mathf.Abs(n0) && Mathf.Abs(n1) > Mathf.Abs(n2))
		{
			result = n1;
		}
		else
		{
			result = n2;
		}
		
		return result;
	}
	
	//Returns the topmost parent with a certain component
	public function GetTopmostParentComponent(theType : System.Type, tr : Transform) : Component
	{
		var getting : Component = null;

		while (tr.parent != null)
		{
			if (tr.parent.GetComponent(theType) != null)
			{
				getting = tr.parent.GetComponent(theType);
			}

			tr = tr.parent;
		}

		return getting;
	}
}
