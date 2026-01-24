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
    /// Selected shipping option per warehouse shipping group.
    /// Key: GroupId (or WarehouseId for backward compatibility)
    /// Value: SelectionKey ("so:{guid}" for flat-rate, "dyn:{provider}:{serviceCode}" for dynamic)
    /// Note: Multiple groups can exist for the same warehouse when products have different shipping restrictions
    /// </summary>
    public Dictionary<Guid, string> SelectedShippingOptions { get; set; } = [];

    /// <summary>
    /// Quoted shipping costs at the time of selection.
    /// Key: GroupId, Value: QuotedShippingCost record
    /// Used to preserve the rate shown to the customer through checkout completion.
    /// </summary>
    public Dictionary<Guid, QuotedShippingCost> QuotedShippingCosts { get; set; } = [];

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

    /// <summary>
    /// Whether the customer has opted in to marketing communications.
    /// </summary>
    public bool AcceptsMarketing { get; set; }

    /// <summary>
    /// When this checkout session was first created.
    /// Used with AbsoluteTimeoutMinutes to enforce maximum session lifetime.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When this session was last accessed or modified.
    /// Used with SlidingTimeoutMinutes for sliding expiration.
    /// </summary>
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// The invoice ID created from this checkout session.
    /// Used for security validation - ensures the session owns the invoice being paid.
    /// Set when the invoice is created during checkout.
    /// </summary>
    public Guid? InvoiceId { get; set; }

}

