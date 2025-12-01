namespace Merchello.Core.Shared.Extensions;

public static class NumericExtensions
{
    /// <summary>
    /// Converts an object bool int into a bool
    /// </summary>
    /// <param name="obj"></param>
    /// <returns></returns>
    public static bool ToBool(this object? obj)
    {
        if (obj != null)
        {
            var stringValue = obj.ToString();
            if (!stringValue.IsNullOrWhiteSpace())
            {
                var trimmed = stringValue.Trim();
                if (trimmed.Equals("1") || stringValue.Equals("0"))
                {
                    return trimmed.Equals("1");
                }
                if (bool.TryParse(trimmed, out var returnResult))
                {
                    return returnResult;
                }
            }
        }
        return false;
    }

    /// <summary>
    /// Converts an object string int into a int
    /// </summary>
    /// <param name="obj"></param>
    /// <returns></returns>
    public static int ToInt(this object? obj)
    {
        if (obj != null)
        {
            var stringValue = obj.ToString();
            if (!stringValue.IsNullOrWhiteSpace())
            {
                if (int.TryParse(stringValue, out var returnResult))
                {
                    return returnResult;
                }
            }
        }
        return 0;
    }



    /// <summary>
    /// Converts an object string decimal into a decimal
    /// </summary>
    /// <param name="obj"></param>
    /// <returns></returns>
    public static decimal ToDecimal(this object? obj)
    {
        if (obj != null)
        {
            var stringValue = obj.ToString();
            if (!stringValue.IsNullOrWhiteSpace())
            {
                if (decimal.TryParse(stringValue, out var returnResult))
                {
                    return returnResult;
                }
            }
        }
        return 0M;
    }
}
