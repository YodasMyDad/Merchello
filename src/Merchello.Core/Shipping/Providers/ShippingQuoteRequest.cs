using Merchello.Core.Locality.Models;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Encapsulates the information required to request live rates.
/// </summary>
public class ShippingQuoteRequest
{
    /// <summary>
    /// Associated basket ID (if applicable).
    /// </summary>
    public Guid? BasketId { get; init; }

    /// <summary>
    /// Destination country code (ISO 3166-1 alpha-2).
    /// </summary>
    public string CountryCode { get; init; } = null!;

    /// <summary>
    /// Destination state/province code.
    /// </summary>
    public string? StateOrProvinceCode { get; init; }

    /// <summary>
    /// Destination postal/zip code.
    /// </summary>
    public string? PostalCode { get; init; }

    /// <summary>
    /// Destination city.
    /// </summary>
    public string? City { get; init; }

    /// <summary>
    /// Full destination address for providers that require complete address details.
    /// </summary>
    public Address? DestinationAddress { get; init; }

    /// <summary>
    /// Origin warehouse address for carrier API calls.
    /// </summary>
    public Address? OriginAddress { get; init; }

    /// <summary>
    /// Origin warehouse ID.
    /// </summary>
    public Guid? OriginWarehouseId { get; init; }

    /// <summary>
    /// When true, this is an estimate request with minimal address info (country/postal only).
    /// Providers requiring full address should return estimate or skip.
    /// </summary>
    public bool IsEstimateMode { get; init; }

    /// <summary>
    /// Subtotal of items in the basket.
    /// </summary>
    public decimal ItemsSubtotal { get; init; }

    /// <summary>
    /// Currency code for pricing.
    /// </summary>
    public string? CurrencyCode { get; init; }

    /// <summary>
    /// Items being shipped.
    /// </summary>
    public IReadOnlyCollection<ShippingQuoteItem> Items { get; init; } = [];

    /// <summary>
    /// Pre-built packages with dimensions and weights.
    /// </summary>
    public IReadOnlyCollection<ShipmentPackage> Packages { get; init; } = [];

    /// <summary>
    /// Additional provider-specific data.
    /// </summary>
    public IDictionary<string, string>? ExtendedProperties { get; init; }
}
