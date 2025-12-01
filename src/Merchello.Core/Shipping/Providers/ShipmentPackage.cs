using System.Collections.Generic;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Represents a packed shipment entity passed to providers.
/// </summary>
public class ShipmentPackage
{
    public ShipmentPackage(
        decimal weightKg,
        decimal? lengthCm = null,
        decimal? widthCm = null,
        decimal? heightCm = null)
    {
        WeightKg = weightKg;
        LengthCm = lengthCm;
        WidthCm = widthCm;
        HeightCm = heightCm;
    }

    public decimal WeightKg { get; }
    public decimal? LengthCm { get; }
    public decimal? WidthCm { get; }
    public decimal? HeightCm { get; }

    public IDictionary<string, string>? ExtendedProperties { get; init; }
}
