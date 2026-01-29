namespace Merchello.Core.Payments.Models;

/// <summary>
/// The type of saved payment method.
/// </summary>
public enum SavedPaymentMethodType
{
    /// <summary>
    /// Credit or debit card.
    /// </summary>
    Card,

    /// <summary>
    /// PayPal account.
    /// </summary>
    PayPal,

    /// <summary>
    /// Bank account (ACH, SEPA, etc.).
    /// </summary>
    BankAccount,

    /// <summary>
    /// Other payment method type.
    /// </summary>
    Other
}
