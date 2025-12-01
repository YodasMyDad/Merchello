using System.Globalization;

namespace Merchello.Core.Shared.Extensions;

public static class LocalityExtensions
{
    /// <summary>
    /// Returns the country name from the country code
    /// </summary>
    /// <param name="code"></param>
    /// <returns></returns>
    public static string GetCountryName(this string code)
    {
        try
        {
            var region = new RegionInfo(code);
            return region.EnglishName;
        }
        catch (ArgumentException)
        {
            return "Invalid country code";
        }
    }
}
