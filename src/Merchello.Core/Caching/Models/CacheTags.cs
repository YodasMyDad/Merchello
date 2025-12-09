namespace Merchello.Core.Caching.Models;

public static class CacheTags
{
    public const string LocalityRegions = "locality-regions";
    public static string LocalityRegionsCountry(string countryCode) => $"locality-regions:{countryCode.ToUpperInvariant()}";
}

