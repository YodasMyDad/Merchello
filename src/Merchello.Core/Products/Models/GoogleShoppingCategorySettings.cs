namespace Merchello.Core.Products.Models;

public class GoogleShoppingCategorySettings
{
    /// <summary>
    /// Country code to use when no mapping exists for the requested country.
    /// </summary>
    public string FallbackCountryCode { get; set; } = Constants.FallbackCountryCode;

    /// <summary>
    /// Cache duration for taxonomy feeds in hours.
    /// </summary>
    public int CacheHours { get; set; } = 24;

    /// <summary>
    /// Country code to taxonomy URL mappings.
    /// Example: { "US": "https://www.google.com/basepages/producttype/taxonomy.en-US.txt" }
    /// </summary>
    public Dictionary<string, string> TaxonomyUrls { get; set; } = [];
}

