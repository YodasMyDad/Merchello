using System.Collections.Generic;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Lightweight snapshot of a product used for shipping calculations.
/// </summary>
public class ShippingProductSnapshot
{
    public Guid ProductId { get; init; }
    public string? Name { get; init; }
    public decimal? WeightKg { get; init; }
    public IReadOnlyCollection<ShippingOptionSnapshot> ShippingOptions { get; init; } = Array.Empty<ShippingOptionSnapshot>();
}
