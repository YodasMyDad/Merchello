using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for saving shipping selections to the checkout session
/// </summary>
public class SaveShippingSelectionsParameters
{
    /// <summary>
    /// The basket to update
    /// </summary>
    public required Basket Basket { get; init; }

    /// <summary>
    /// The checkout session to update
    /// </summary>
    public required CheckoutSession Session { get; init; }

    /// <summary>
    /// Shipping selections per group (GroupId -> SelectionKey).
    /// SelectionKey format: "so:{guid}" for flat-rate, "dyn:{provider}:{serviceCode}" for dynamic.
    /// </summary>
    public required Dictionary<Guid, string> Selections { get; init; }

    /// <summary>
    /// Quoted costs for each selection at the time of saving.
    /// Key: GroupId, Value: Cost quoted to customer.
    /// Used to preserve the rate through checkout completion.
    /// </summary>
    public Dictionary<Guid, decimal>? QuotedCosts { get; init; }

    /// <summary>
    /// Optional delivery date selections per group (GroupId -> DateTime)
    /// </summary>
    public Dictionary<Guid, DateTime>? DeliveryDates { get; init; }
}
