using Merchello.Core.Products.Models;

namespace Merchello.Core.Storefront.Services.Parameters;

/// <summary>
/// Parameters for getting stock available at a specific location
/// </summary>
public class GetStockForLocationParameters
{
    /// <summary>
    /// The product to check stock for
    /// </summary>
    public required Product Product { get; init; }

    /// <summary>
    /// ISO country code (e.g., "US", "GB")
    /// </summary>
    public required string CountryCode { get; init; }

    /// <summary>
    /// Optional region/state code
    /// </summary>
    public string? RegionCode { get; init; }
}
