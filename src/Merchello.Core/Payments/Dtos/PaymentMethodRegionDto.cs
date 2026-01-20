namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// DTO for a region/country where a payment method is available.
/// </summary>
public class PaymentMethodRegionDto
{
    /// <summary>
    /// ISO 3166-1 alpha-2 country code (e.g., "NL", "BE") or region code (e.g., "EU", "US").
    /// </summary>
    public required string Code { get; set; }

    /// <summary>
    /// Human-readable name of the region (e.g., "Netherlands", "Belgium", "European Union").
    /// </summary>
    public required string Name { get; set; }
}
