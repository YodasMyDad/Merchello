using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for saving shipping selections to the checkout session.
/// </summary>
public class SaveSessionShippingSelectionsParameters
{
    /// <summary>
    /// The basket ID.
    /// </summary>
    public required Guid BasketId { get; init; }

    /// <summary>
    /// Shipping selections per group (GroupId -> SelectionKey).
    /// </summary>
    public required Dictionary<Guid, string> Selections { get; init; }

    /// <summary>
    /// Optional delivery date selections per group.
    /// </summary>
    public Dictionary<Guid, DateTime>? DeliveryDates { get; init; }

    /// <summary>
    /// Optional quoted shipping costs per group (preserved for invoice creation).
    /// </summary>
    public Dictionary<Guid, QuotedShippingCost>? QuotedCosts { get; init; }
}
