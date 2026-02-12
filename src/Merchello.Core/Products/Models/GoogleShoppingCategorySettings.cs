namespace Merchello.Core.Products.Models;

public class GoogleShoppingCategorySettings
{
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

