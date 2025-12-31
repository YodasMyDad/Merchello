using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Available express checkout method for display at start of checkout.
/// </summary>
public class ExpressCheckoutMethodDto
{
    /// <summary>
    /// The provider alias (e.g., "stripe", "braintree", "paypal").
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The method alias within the provider (e.g., "applepay", "googlepay", "paypal").
    /// </summary>
    public required string MethodAlias { get; set; }

    /// <summary>
    /// Display name shown to customers.
    /// </summary>
    public required string DisplayName { get; set; }

    /// <summary>
    /// Icon identifier or URL.
    /// </summary>
    public string? Icon { get; set; }

    /// <summary>
    /// The type/category of this payment method (e.g., ApplePay, GooglePay).
    /// </summary>
    public PaymentMethodType? MethodType { get; set; }

    /// <summary>
    /// Sort order for display.
    /// </summary>
    public int SortOrder { get; set; }
}
