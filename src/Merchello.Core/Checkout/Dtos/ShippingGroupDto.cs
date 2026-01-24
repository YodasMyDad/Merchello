namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// A shipping group representing items that will ship together from a warehouse.
/// Each group can have different shipping options based on product restrictions.
/// </summary>
public class ShippingGroupDto
{
    /// <summary>
    /// Unique identifier for this group (deterministic based on warehouse + shipping options).
    /// </summary>
    public Guid GroupId { get; set; }

    /// <summary>
    /// Display name (e.g., "Shipment from London Warehouse").
    /// </summary>
    public string GroupName { get; set; } = string.Empty;

    /// <summary>
    /// Warehouse ID (if applicable).
    /// </summary>
    public Guid? WarehouseId { get; set; }

    /// <summary>
    /// Line items in this group.
    /// </summary>
    public List<ShippingGroupLineItemDto> LineItems { get; set; } = [];

    /// <summary>
    /// Available shipping options for this group.
    /// </summary>
    public List<CheckoutShippingOptionDto> ShippingOptions { get; set; } = [];

    /// <summary>
    /// Currently selected shipping option SelectionKey (null if not yet selected).
    /// Format: "so:{guid}" for flat-rate, "dyn:{provider}:{serviceCode}" for dynamic.
    /// </summary>
    public string? SelectedShippingOptionId { get; set; }

    /// <summary>
    /// Selected delivery date (if applicable and supported by the shipping option).
    /// </summary>
    public DateTime? SelectedDeliveryDate { get; set; }

    /// <summary>
    /// Error message if rate fetching failed for this group.
    /// </summary>
    public string? RateError { get; set; }

    /// <summary>
    /// True if any shipping options in this group are fallback rates.
    /// </summary>
    public bool HasFallbackRates { get; set; }
}
