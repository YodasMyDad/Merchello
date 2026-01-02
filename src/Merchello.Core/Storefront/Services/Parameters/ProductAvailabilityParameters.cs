using Merchello.Core.Products.Models;

namespace Merchello.Core.Storefront.Services.Parameters;

/// <summary>
/// Parameters for checking product availability at a specific location
/// </summary>
public class ProductAvailabilityParameters
{
    /// <summary>
    /// The product to check availability for
    /// </summary>
    public required Product Product { get; init; }

    /// <summary>
    /// ISO country code (e.g., "US", "GB")
    /// </summary>
    public required string CountryCode { get; init; }

    /// <summary>
    /// Optional region/state code for more specific availability
    /// </summary>
    public string? RegionCode { get; init; }

    /// <summary>
    /// Quantity to check availability for. Defaults to 1.
    /// </summary>
    public int Quantity { get; init; } = 1;
}
