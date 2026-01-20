namespace Merchello.Core.Protocols.Models;

/// <summary>
/// A fulfillment method (shipping or pickup).
/// </summary>
public class FulfillmentMethodState
{
    /// <summary>
    /// Type: shipping, pickup
    /// </summary>
    public required string Type { get; init; }

    public required IReadOnlyList<string> LineItemIds { get; init; }
    public IReadOnlyList<FulfillmentDestinationState>? Destinations { get; init; }
    public required IReadOnlyList<FulfillmentGroupState> Groups { get; init; }
}
