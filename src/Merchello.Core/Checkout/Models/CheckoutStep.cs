namespace Merchello.Core.Checkout.Models;

/// <summary>
/// Represents the steps in the checkout flow.
/// </summary>
public enum CheckoutStep
{
    /// <summary>
    /// Contact information and addresses step.
    /// </summary>
    Information,

    /// <summary>
    /// Shipping method selection step.
    /// </summary>
    Shipping,

    /// <summary>
    /// Payment method and processing step.
    /// </summary>
    Payment,

    /// <summary>
    /// Order confirmation step.
    /// </summary>
    Confirmation,

    /// <summary>
    /// Payment return/callback handling step.
    /// </summary>
    PaymentReturn,

    /// <summary>
    /// Payment cancellation handling step.
    /// </summary>
    PaymentCancelled
}
