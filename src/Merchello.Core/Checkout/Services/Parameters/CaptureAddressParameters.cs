using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for capturing partial address data during checkout.
/// Used for auto-saving address fields as user enters them.
/// </summary>
public class CaptureAddressParameters
{
    /// <summary>
    /// The basket to update.
    /// </summary>
    public required Basket Basket { get; init; }

    /// <summary>
    /// Email address (optional).
    /// </summary>
    public string? Email { get; init; }

    /// <summary>
    /// Billing address fields to update.
    /// </summary>
    public CheckoutAddressDto? BillingAddress { get; init; }

    /// <summary>
    /// Shipping address fields to update (null if same as billing).
    /// </summary>
    public CheckoutAddressDto? ShippingAddress { get; init; }

    /// <summary>
    /// Whether shipping address is the same as billing.
    /// </summary>
    public bool ShippingSameAsBilling { get; init; } = true;
}
