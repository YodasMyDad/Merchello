namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Response from checkout initialization containing basket, shipping groups,
/// and auto-selected shipping options.
/// </summary>
public class InitializeCheckoutResponseDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public Dictionary<string, string>? Errors { get; set; }

    /// <summary>
    /// The basket with calculated totals including auto-selected shipping.
    /// </summary>
    public CheckoutBasketDto? Basket { get; set; }

    /// <summary>
    /// Shipping groups with available options and auto-selected option per group.
    /// </summary>
    public List<ShippingGroupDto>? ShippingGroups { get; set; }

    /// <summary>
    /// Combined shipping total for all groups (convenience for express checkout display).
    /// </summary>
    public decimal CombinedShippingTotal { get; set; }

    /// <summary>
    /// Formatted combined shipping total.
    /// </summary>
    public string FormattedCombinedShippingTotal { get; set; } = string.Empty;

    /// <summary>
    /// Whether shipping was auto-selected (true) or needs manual selection (false).
    /// </summary>
    public bool ShippingAutoSelected { get; set; }
}
