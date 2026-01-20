namespace Merchello.Core.Payments.Models;

/// <summary>
/// Represents a region/country where a payment method is available.
/// </summary>
public class PaymentMethodRegion
{
    /// <summary>
    /// ISO 3166-1 alpha-2 country code (e.g., "NL", "BE") or region code (e.g., "EU", "US").
    /// </summary>
    public required string Code { get; init; }

    /// <summary>
    /// Human-readable name of the region (e.g., "Netherlands", "Belgium", "European Union").
    /// </summary>
    public required string Name { get; init; }
}
