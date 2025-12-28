namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Response from selecting shipping options.
/// </summary>
public class SelectShippingResponse
{
    /// <summary>
    /// Whether the selection was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Success or error message.
    /// </summary>
    public string? Message { get; set; }

    /// <summary>
    /// Validation errors per group.
    /// Key: GroupId or field name, Value: Error message.
    /// </summary>
    public Dictionary<string, string>? Errors { get; set; }

    /// <summary>
    /// Updated basket with shipping costs applied.
    /// </summary>
    public CheckoutBasketDto? Basket { get; set; }

    /// <summary>
    /// Updated shipping groups with selections applied.
    /// </summary>
    public List<ShippingGroupDto>? ShippingGroups { get; set; }
}
