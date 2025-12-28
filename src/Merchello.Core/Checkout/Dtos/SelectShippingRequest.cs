namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Request to select shipping options for checkout.
/// </summary>
public class SelectShippingRequest
{
    /// <summary>
    /// Shipping selections per group.
    /// Key: GroupId, Value: Selected shipping option ID.
    /// </summary>
    public Dictionary<Guid, Guid> Selections { get; set; } = [];

    /// <summary>
    /// Optional delivery date selections per group.
    /// Key: GroupId, Value: Requested delivery date.
    /// Only applicable for shipping options that support delivery date selection.
    /// </summary>
    public Dictionary<Guid, DateTime>? DeliveryDates { get; set; }
}
