namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Request to select shipping options for checkout.
/// </summary>
public class SelectShippingRequestDto
{
    /// <summary>
    /// Shipping selections per group.
    /// Key: GroupId, Value: SelectionKey ("so:{guid}" for flat-rate, "dyn:{provider}:{serviceCode}" for dynamic).
    /// </summary>
    public Dictionary<Guid, string> Selections { get; set; } = [];

    /// <summary>
    /// Optional delivery date selections per group.
    /// Key: GroupId, Value: Requested delivery date.
    /// Only applicable for shipping options that support delivery date selection.
    /// </summary>
    public Dictionary<Guid, DateTime>? DeliveryDates { get; set; }

    /// <summary>
    /// Quoted costs for each selection.
    /// Key: GroupId, Value: Cost quoted to customer.
    /// Used to preserve the rate through checkout completion for dynamic providers.
    /// </summary>
    public Dictionary<Guid, decimal>? QuotedCosts { get; set; }
}
