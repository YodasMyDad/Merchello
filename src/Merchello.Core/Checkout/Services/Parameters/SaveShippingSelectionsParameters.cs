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
    /// Shipping selections per group (GroupId -> ShippingOptionId)
    /// </summary>
    public required Dictionary<Guid, Guid> Selections { get; init; }

    /// <summary>
    /// Optional delivery date selections per group (GroupId -> DateTime)
    /// </summary>
    public Dictionary<Guid, DateTime>? DeliveryDates { get; init; }
}
