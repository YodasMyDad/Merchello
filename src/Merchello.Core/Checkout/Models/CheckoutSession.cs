using Merchello.Core.Locality.Models;

namespace Merchello.Core.Checkout.Models;

public class CheckoutSession
{
    /// <summary>
    /// The basket being checked out
    /// </summary>
    public Guid BasketId { get; set; }

    /// <summary>
    /// Billing address
    /// </summary>
    public Address BillingAddress { get; set; } = new();

    /// <summary>
    /// Shipping address
    /// </summary>
    public Address ShippingAddress { get; set; } = new();

    /// <summary>
    /// Whether shipping address is same as billing
    /// </summary>
    public bool ShippingSameAsBilling { get; set; }

    /// <summary>
    /// Selected shipping option per warehouse shipping group
    /// Key: GroupId (or WarehouseId for backward compatibility), Value: ShippingOptionId
    /// Note: Multiple groups can exist for the same warehouse when products have different shipping restrictions
    /// </summary>
    public Dictionary<Guid, Guid> SelectedShippingOptions { get; set; } = [];

    /// <summary>
    /// Selected delivery date per warehouse shipping group (if applicable)
    /// Key: GroupId, Value: Requested delivery date
    /// Only populated for shipping options that allow delivery date selection
    /// </summary>
    public Dictionary<Guid, DateTime> SelectedDeliveryDates { get; set; } = [];

    /// <summary>
    /// Current step in checkout process
    /// </summary>
    public CheckoutStep CurrentStep { get; set; } = CheckoutStep.Information;
}

