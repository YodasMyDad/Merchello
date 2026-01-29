namespace Merchello.Core.Checkout.Models;

/// <summary>
/// Represents the steps in the checkout flow.
/// </summary>
public enum CheckoutStep
{
    /// <summary>
    /// Contact information and addresses step.
    /// </summary>
    Information = 0,

    /// <summary>
    /// Shipping method selection step.
    /// </summary>
    Shipping = 1,

    /// <summary>
    /// Payment method and processing step.
    /// </summary>
    Payment = 2,

    /// <summary>
    /// Order confirmation step.
    /// </summary>
    Confirmation = 3,

    /// <summary>
    /// Payment return/callback handling step.
    /// </summary>
    PaymentReturn = 4,

    /// <summary>
    /// Payment cancellation handling step.
    /// </summary>
    PaymentCancelled = 5,

    /// <summary>
    /// Post-purchase upsell step.
    /// </summary>
    PostPurchase = 6
}
