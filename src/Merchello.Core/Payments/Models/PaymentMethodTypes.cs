namespace Merchello.Core.Payments.Models;

/// <summary>
/// Well-known payment method type constants for deduplication.
/// When multiple providers offer the same method type (e.g., Apple Pay via Stripe and Braintree),
/// only one is shown at checkout based on priority settings.
/// </summary>
/// <remarks>
/// <para>
/// Third-party providers can use any string value for <see cref="PaymentMethodDefinition.MethodType"/>.
/// Methods with null or unique method types are not deduplicated.
/// </para>
/// <para>
/// Use these constants for common payment methods to enable proper deduplication:
/// <code>
/// new PaymentMethodDefinition
/// {
///     Alias = "cards",
///     MethodType = PaymentMethodTypes.Cards,
///     // ...
/// }
/// </code>
/// </para>
/// <para>
/// For custom or region-specific methods that should not be deduplicated, use a unique string
/// or leave MethodType as null:
/// <code>
/// new PaymentMethodDefinition
/// {
///     Alias = "ideal",
///     MethodType = "ideal-nl",  // Custom type - won't be deduplicated
///     // ...
/// }
/// </code>
/// </para>
/// </remarks>
public static class PaymentMethodTypes
{
    /// <summary>
    /// Credit/Debit card payments.
    /// </summary>
    public const string Cards = "cards";

    /// <summary>
    /// Apple Pay express checkout.
    /// </summary>
    public const string ApplePay = "apple-pay";

    /// <summary>
    /// Google Pay express checkout.
    /// </summary>
    public const string GooglePay = "google-pay";

    /// <summary>
    /// Amazon Pay express checkout.
    /// </summary>
    public const string AmazonPay = "amazon-pay";

    /// <summary>
    /// PayPal payments.
    /// </summary>
    public const string PayPal = "paypal";

    /// <summary>
    /// Stripe Link express checkout.
    /// </summary>
    public const string Link = "link";

    /// <summary>
    /// Buy Now Pay Later options (Klarna, Afterpay, etc.).
    /// </summary>
    public const string BuyNowPayLater = "bnpl";

    /// <summary>
    /// Direct bank transfer.
    /// </summary>
    public const string BankTransfer = "bank-transfer";

    /// <summary>
    /// Venmo payments (US only).
    /// </summary>
    public const string Venmo = "venmo";

    /// <summary>
    /// Manual/offline payment.
    /// </summary>
    public const string Manual = "manual";
}
