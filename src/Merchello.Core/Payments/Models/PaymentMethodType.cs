namespace Merchello.Core.Payments.Models;

/// <summary>
/// Defines the type/category of a payment method.
/// Used for deduplication when multiple providers offer the same method type.
/// </summary>
public enum PaymentMethodType
{
    /// <summary>
    /// Credit/Debit card payments.
    /// </summary>
    Cards = 0,

    /// <summary>
    /// Apple Pay express checkout.
    /// </summary>
    ApplePay = 10,

    /// <summary>
    /// Google Pay express checkout.
    /// </summary>
    GooglePay = 20,

    /// <summary>
    /// PayPal payments.
    /// </summary>
    PayPal = 30,

    /// <summary>
    /// Stripe Link express checkout.
    /// </summary>
    Link = 40,

    /// <summary>
    /// Buy Now Pay Later options (Klarna, Afterpay, etc.).
    /// </summary>
    BuyNowPayLater = 50,

    /// <summary>
    /// Direct bank transfer.
    /// </summary>
    BankTransfer = 60,

    /// <summary>
    /// Manual/offline payment.
    /// </summary>
    Manual = 100,

    /// <summary>
    /// Custom provider-specific method that doesn't fit other categories.
    /// Methods with this type are NOT deduplicated.
    /// </summary>
    Custom = 999
}
