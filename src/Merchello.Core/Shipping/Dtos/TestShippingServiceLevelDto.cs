namespace Merchello.Core.Shipping.Dtos;

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
