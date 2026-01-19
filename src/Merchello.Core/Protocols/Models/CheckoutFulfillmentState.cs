namespace Merchello.Core.Protocols.Models;

/// <summary>
/// Protocol-agnostic representation of fulfillment options.
/// </summary>
public class CheckoutFulfillmentState
{
    public required IReadOnlyList<FulfillmentMethodState> Methods { get; init; }
}

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

/// <summary>
/// A group of items that ship together (e.g., from the same warehouse).
/// </summary>
public class FulfillmentGroupState
{
    public required string GroupId { get; init; }
    public string? GroupName { get; init; }
    public required IReadOnlyList<string> LineItemIds { get; init; }
    public string? SelectedOptionId { get; init; }
    public required IReadOnlyList<FulfillmentOptionState> Options { get; init; }
}

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

/// <summary>
/// A fulfillment destination.
/// </summary>
public class FulfillmentDestinationState
{
    /// <summary>
    /// Type: postal_address, retail_location
    /// </summary>
    public required string Type { get; init; }

    public CheckoutAddressState? Address { get; init; }
    public RetailLocationState? RetailLocation { get; init; }
}

/// <summary>
/// A retail location for pickup.
/// </summary>
public class RetailLocationState
{
    public required string LocationId { get; init; }
    public required string Name { get; init; }
    public CheckoutAddressState? Address { get; init; }
}
