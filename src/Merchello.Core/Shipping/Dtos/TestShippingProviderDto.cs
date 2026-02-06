namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// DTO for testing a shipping provider configuration
/// </summary>
public class TestShippingProviderDto
{
    /// <summary>
    /// The warehouse ID to use as origin address
    /// </summary>
    public required Guid WarehouseId { get; set; }

    /// <summary>
    /// Destination country code (ISO 3166-1 alpha-2)
    /// </summary>
    public required string CountryCode { get; set; }

    /// <summary>
    /// Destination state/province code (optional)
    /// </summary>
    public string? RegionCode { get; set; }

    /// <summary>
    /// Destination postal code (optional but recommended for accurate rates)
    /// </summary>
    public string? PostalCode { get; set; }

    /// <summary>
    /// Destination city (optional)
    /// </summary>
    public string? City { get; set; }

    /// <summary>
    /// Package weight in kg
    /// </summary>
    public decimal WeightKg { get; set; } = 1.0m;

    /// <summary>
    /// Package length in cm (optional)
    /// </summary>
    public decimal? LengthCm { get; set; }

    /// <summary>
    /// Package width in cm (optional)
    /// </summary>
    public decimal? WidthCm { get; set; }

    /// <summary>
    /// Package height in cm (optional)
    /// </summary>
    public decimal? HeightCm { get; set; }

    /// <summary>
    /// Item value/subtotal for rate calculation (e.g., for free shipping thresholds)
    /// </summary>
    public decimal ItemsSubtotal { get; set; } = 100.00m;
}
