namespace Merchello.Core.Protocols.Models;

/// <summary>
/// A shipping/fulfillment option within a group.
/// </summary>
public class FulfillmentOptionState
{
    public required string OptionId { get; init; }
    public required string Title { get; init; }
    public string? Description { get; init; }

    /// <summary>
    /// Amount in minor units (cents).
    /// </summary>
    public required long Amount { get; init; }

    public required string Currency { get; init; }
    public string? EarliestFulfillmentTime { get; init; }
    public string? LatestFulfillmentTime { get; init; }
    public int? EstimatedDeliveryDays { get; init; }
}
