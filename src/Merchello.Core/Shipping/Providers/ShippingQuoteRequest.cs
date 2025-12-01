using System.Collections.Generic;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Encapsulates the information required to request live rates.
/// </summary>
public class ShippingQuoteRequest
{
    public Guid? BasketId { get; init; }

    public string CountryCode { get; init; } = null!;

    public string? StateOrProvinceCode { get; init; }

    public string? PostalCode { get; init; }

    public string? City { get; init; }

    public decimal ItemsSubtotal { get; init; }

    public string? CurrencyCode { get; init; }

    public IReadOnlyCollection<ShippingQuoteItem> Items { get; init; } = Array.Empty<ShippingQuoteItem>();

    public IReadOnlyCollection<ShipmentPackage> Packages { get; init; } = Array.Empty<ShipmentPackage>();

    public IDictionary<string, string>? ExtendedProperties { get; init; }
}
