using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Services.Parameters;

/// <summary>
/// Parameters for querying shipping cost to a destination.
/// </summary>
public class ShippingCostQuery
{
    /// <summary>
    /// The shipping option with its costs.
    /// </summary>
    public required ShippingOption ShippingOption { get; init; }

    /// <summary>
    /// Destination country code (ISO 2-letter).
    /// </summary>
    public required string CountryCode { get; init; }

    /// <summary>
    /// Optional destination state/province code.
    /// </summary>
    public string? StateOrProvinceCode { get; init; }
}
