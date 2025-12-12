namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Request DTO for testing a shipping provider configuration
/// </summary>
public class TestShippingProviderRequestDto
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
    public string? StateOrProvinceCode { get; set; }

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

/// <summary>
/// Response DTO for shipping provider test results
/// </summary>
public class TestShippingProviderResponseDto
{
    /// <summary>
    /// Provider key that was tested
    /// </summary>
    public required string ProviderKey { get; set; }

    /// <summary>
    /// Provider display name
    /// </summary>
    public required string ProviderName { get; set; }

    /// <summary>
    /// Whether the test was successful (provider returned rates without errors)
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Service levels returned by the provider
    /// </summary>
    public List<TestShippingServiceLevelDto> ServiceLevels { get; set; } = [];

    /// <summary>
    /// Any errors encountered during the test
    /// </summary>
    public List<string> Errors { get; set; } = [];
}

/// <summary>
/// Service level DTO for test results
/// </summary>
public class TestShippingServiceLevelDto
{
    /// <summary>
    /// Unique service code (e.g., "fedex-ground", "ups-next-day")
    /// </summary>
    public required string ServiceCode { get; set; }

    /// <summary>
    /// Raw service type code from the provider (e.g., "FEDEX_GROUND", "UPS_NEXT_DAY_AIR")
    /// </summary>
    public string? ServiceType { get; set; }

    /// <summary>
    /// Human-readable service name (e.g., "FedEx Ground", "UPS Next Day Air")
    /// </summary>
    public required string ServiceName { get; set; }

    /// <summary>
    /// Total shipping cost
    /// </summary>
    public decimal TotalCost { get; set; }

    /// <summary>
    /// Currency code (e.g., "USD", "GBP")
    /// </summary>
    public string CurrencyCode { get; set; } = "GBP";

    /// <summary>
    /// Transit time as human-readable string (e.g., "2-3 days")
    /// </summary>
    public string? TransitTime { get; set; }

    /// <summary>
    /// Estimated delivery date (if available)
    /// </summary>
    public DateTime? EstimatedDeliveryDate { get; set; }

    /// <summary>
    /// Additional description or notes
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Whether this service type has a configured ShippingOption in the system
    /// </summary>
    public bool IsConfigured { get; set; }

    /// <summary>
    /// Whether the provider returned a valid rate for this service type.
    /// False indicates the service type is configured but the API did not return rates for it.
    /// </summary>
    public bool IsValid { get; set; } = true;
}
