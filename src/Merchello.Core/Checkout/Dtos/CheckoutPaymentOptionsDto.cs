using Merchello.Core.Payments.Dtos;

namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Payment options available during checkout.
/// </summary>
public class CheckoutPaymentOptionsDto
{
    /// <summary>
    /// Available payment providers for new payment methods.
    /// </summary>
    public List<PaymentMethodDto> Providers { get; set; } = [];

    /// <summary>
    /// Saved payment methods available for the customer (if logged in).
    /// </summary>
    public List<StorefrontSavedMethodDto> SavedPaymentMethods { get; set; } = [];

    /// <summary>
    /// Whether the customer has any saved payment methods.
    /// </summary>
    public bool HasSavedPaymentMethods => SavedPaymentMethods.Count > 0;

    /// <summary>
    /// Whether any provider supports saving payment methods (vaulting).
    /// </summary>
    public bool CanSavePaymentMethods { get; set; }
}
