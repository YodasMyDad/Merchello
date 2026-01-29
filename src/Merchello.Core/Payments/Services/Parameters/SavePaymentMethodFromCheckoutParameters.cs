using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Services.Parameters;

/// <summary>
/// Parameters for saving a payment method during checkout.
/// </summary>
public class SavePaymentMethodFromCheckoutParameters
{
    /// <summary>
    /// The Merchello customer ID.
    /// </summary>
    public required Guid CustomerId { get; init; }

    /// <summary>
    /// The payment provider alias.
    /// </summary>
    public required string ProviderAlias { get; init; }

    /// <summary>
    /// The provider's payment method ID/token.
    /// </summary>
    public required string ProviderMethodId { get; init; }

    /// <summary>
    /// The provider's customer ID.
    /// </summary>
    public string? ProviderCustomerId { get; init; }

    /// <summary>
    /// The type of payment method.
    /// </summary>
    public SavedPaymentMethodType MethodType { get; init; }

    /// <summary>
    /// The card brand (for cards).
    /// </summary>
    public string? CardBrand { get; init; }

    /// <summary>
    /// The last 4 digits.
    /// </summary>
    public string? Last4 { get; init; }

    /// <summary>
    /// The card expiry month (1-12).
    /// </summary>
    public int? ExpiryMonth { get; init; }

    /// <summary>
    /// The card expiry year (4 digits).
    /// </summary>
    public int? ExpiryYear { get; init; }

    /// <summary>
    /// The billing name.
    /// </summary>
    public string? BillingName { get; init; }

    /// <summary>
    /// The billing email.
    /// </summary>
    public string? BillingEmail { get; init; }

    /// <summary>
    /// Whether to set this as the customer's default payment method.
    /// </summary>
    public bool SetAsDefault { get; init; }

    /// <summary>
    /// IP address of the customer (for consent tracking).
    /// </summary>
    public string? IpAddress { get; init; }

    /// <summary>
    /// Additional provider-specific data.
    /// </summary>
    public Dictionary<string, object>? ExtendedData { get; init; }
}
