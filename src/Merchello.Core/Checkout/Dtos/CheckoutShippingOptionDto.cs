namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// A shipping option available for a shipping group.
/// </summary>
public class CheckoutShippingOptionDto : Merchello.Core.Shipping.Dtos.ShippingOptionBaseDto
{
    /// <summary>
    /// Shipping cost in basket currency.
    /// </summary>
    public decimal Cost { get; set; }

    /// <summary>
    /// Formatted shipping cost (e.g., "£5.99").
    /// </summary>
    public string FormattedCost { get; set; } = string.Empty;

    /// <summary>
    /// Delivery time description (e.g., "Next Day Delivery" or "5-7 days").
    /// </summary>
    public string DeliveryDescription { get; set; } = string.Empty;

    /// <summary>
    /// Unified selection identifier using prefixed format:
    /// - "so:{guid}" for flat-rate ShippingOption
    /// - "dyn:{provider}:{serviceCode}" for dynamic providers
    /// Used for storing selection and submitting to backend.
    /// </summary>
    public string SelectionKey { get; set; } = string.Empty;

    /// <summary>
    /// The carrier service code for dynamic providers (e.g., "FEDEX_GROUND").
    /// Null for flat-rate options.
    /// </summary>
    public string? ServiceCode { get; set; }

    /// <summary>
    /// Estimated delivery date from carrier API (for dynamic providers).
    /// </summary>
    public DateTime? EstimatedDeliveryDate { get; set; }

    /// <summary>
    /// True if this rate is from cache due to carrier API failure.
    /// </summary>
    public bool IsFallbackRate { get; set; }

    /// <summary>
    /// Reason for using fallback rate (e.g., "carrier_api_unavailable").
    /// </summary>
    public string? FallbackReason { get; set; }
}
