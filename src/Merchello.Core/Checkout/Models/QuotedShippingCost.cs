namespace Merchello.Core.Checkout.Models;

/// <summary>
/// Represents a quoted shipping cost preserved through checkout completion.
/// Stored in the checkout session to ensure the rate shown to the customer
/// is the rate charged on the invoice.
/// </summary>
public record QuotedShippingCost(decimal Cost, DateTime QuotedAt);
