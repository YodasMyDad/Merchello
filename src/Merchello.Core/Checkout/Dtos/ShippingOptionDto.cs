namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// A shipping option available for a shipping group.
/// </summary>
public class ShippingOptionDto
{
    /// <summary>
    /// Unique identifier for this shipping option.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Display name (e.g., "Standard Shipping", "Express Delivery").
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Minimum delivery days.
    /// </summary>
    public int DaysFrom { get; set; }

    /// <summary>
    /// Maximum delivery days.
    /// </summary>
    public int DaysTo { get; set; }

    /// <summary>
    /// Whether this is next-day delivery.
    /// </summary>
    public bool IsNextDay { get; set; }

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
    /// Provider key (e.g., "flat-rate", "fedex", "ups").
    /// </summary>
    public string ProviderKey { get; set; } = string.Empty;
}
