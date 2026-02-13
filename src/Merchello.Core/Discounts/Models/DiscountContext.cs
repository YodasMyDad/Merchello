using Merchello.Core.Locality.Models;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Context for discount calculation containing all relevant order information.
/// </summary>
public class DiscountContext
{
    /// <summary>
    /// The customer ID if authenticated.
    /// </summary>
    public Guid? CustomerId { get; set; }

    /// <summary>
    /// The line items in the order.
    /// </summary>
    public List<DiscountContextLineItem> LineItems { get; set; } = [];

    /// <summary>
    /// The subtotal of the order before discounts.
    /// </summary>
    public decimal SubTotal { get; set; }

    /// <summary>
    /// The shipping total before discounts.
    /// </summary>
    public decimal ShippingTotal { get; set; }

    /// <summary>
    /// The currency code for the order.
    /// </summary>
    public string CurrencyCode { get; set; } = string.Empty;

    /// <summary>
    /// The shipping address for the order.
    /// </summary>
    public Address? ShippingAddress { get; set; }

    /// <summary>
    /// The selected shipping option ID.
    /// </summary>
    public Guid? SelectedShippingOptionId { get; set; }

    /// <summary>
    /// Selected shipping option IDs across all shipping groups.
    /// </summary>
    public List<Guid> SelectedShippingOptionIds { get; set; } = [];

    /// <summary>
    /// The customer's segment IDs for eligibility checking.
    /// </summary>
    public List<Guid>? CustomerSegmentIds { get; set; }

    /// <summary>
    /// IDs of discounts already applied to the order.
    /// </summary>
    public List<Guid>? AppliedDiscountIds { get; set; }
}
