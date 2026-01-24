using Merchello.Core.Shipping.Extensions;

namespace Merchello.Core.Shipping.Models;

public class ShippingOptionInfo
{
    /// <summary>
    /// The ShippingOption ID for flat-rate options. Guid.Empty for dynamic providers.
    /// </summary>
    public Guid ShippingOptionId { get; set; }

    /// <summary>
    /// Display name (e.g., "Standard Shipping", "FedEx Ground").
    /// </summary>
    public string Name { get; set; } = string.Empty;

    public int DaysFrom { get; set; }
    public int DaysTo { get; set; }
    public bool IsNextDay { get; set; }

    /// <summary>
    /// Shipping cost in basket currency (NET, before tax-inclusive display adjustments).
    /// </summary>
    public decimal Cost { get; set; }

    /// <summary>
    /// The provider key (e.g., "flat-rate", "fedex", "ups").
    /// </summary>
    public string ProviderKey { get; set; } = "flat-rate";

    /// <summary>
    /// The carrier service code for dynamic providers (e.g., "FEDEX_GROUND", "03").
    /// Null for flat-rate options.
    /// </summary>
    public string? ServiceCode { get; set; }

    /// <summary>
    /// The carrier service display name for dynamic providers.
    /// Used for display when no ShippingOption record exists.
    /// </summary>
    public string? ServiceName { get; set; }

    /// <summary>
    /// Estimated delivery date from carrier API (for dynamic providers).
    /// </summary>
    public DateTime? EstimatedDeliveryDate { get; set; }

    /// <summary>
    /// True if this rate is from cache due to carrier API failure.
    /// </summary>
    public bool IsFallbackRate { get; set; }

    /// <summary>
    /// Reason for using fallback rate (e.g., "carrier_api_unavailable", "rate_limit_exceeded").
    /// </summary>
    public string? FallbackReason { get; set; }

    /// <summary>
    /// Unified selection identifier using prefixed format:
    /// - "so:{guid}" for flat-rate ShippingOption
    /// - "dyn:{provider}:{serviceCode}" for dynamic providers
    /// </summary>
    public string SelectionKey => ShippingOptionId != Guid.Empty
        ? SelectionKeyExtensions.ForShippingOption(ShippingOptionId)
        : !string.IsNullOrEmpty(ServiceCode)
            ? SelectionKeyExtensions.ForDynamicProvider(ProviderKey, ServiceCode)
            : SelectionKeyExtensions.ForDynamicProvider(ProviderKey, Name);

    public string DeliveryTimeDescription => IsNextDay
        ? "Next Day Delivery"
        : DaysFrom <= 0 && DaysTo <= 0
            ? string.Empty
            : $"{DaysFrom}-{DaysTo} days";
}

