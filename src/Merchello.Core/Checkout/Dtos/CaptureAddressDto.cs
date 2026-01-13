namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// DTO for capturing partial address data during checkout.
/// Used for auto-saving address fields as user enters them.
/// </summary>
public class CaptureAddressDto
{
    /// <summary>
    /// Email address (optional, can be captured separately via capture-email endpoint).
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Billing address fields.
    /// </summary>
    public CheckoutAddressDto? BillingAddress { get; set; }

    /// <summary>
    /// Shipping address fields (null if same as billing).
    /// </summary>
    public CheckoutAddressDto? ShippingAddress { get; set; }

    /// <summary>
    /// Whether shipping address is the same as billing.
    /// </summary>
    public bool ShippingSameAsBilling { get; set; } = true;
}
