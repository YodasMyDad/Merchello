using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for getting estimated shipping for a basket.
/// </summary>
public class GetEstimatedShippingParameters
{
    /// <summary>
    /// The basket to calculate shipping for.
    /// </summary>
    public required Basket Basket { get; set; }

    /// <summary>
    /// The country code for the shipping destination.
    /// </summary>
    public required string CountryCode { get; set; }

    /// <summary>
    /// Optional region/state code for the shipping destination.
    /// </summary>
    public string? RegionCode { get; set; }
}
