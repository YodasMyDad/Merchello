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

/// <summary>
/// Request to process an express checkout payment from the frontend.
/// </summary>
public class ExpressCheckoutRequestDto
{
    /// <summary>
    /// The payment provider alias (e.g., "stripe", "paypal").
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The payment method alias (e.g., "applepay", "googlepay").
    /// </summary>
    public string? MethodAlias { get; set; }

    /// <summary>
    /// Payment token or authorization from the provider SDK.
    /// </summary>
    public required string PaymentToken { get; set; }

    /// <summary>
    /// Customer data returned by the express checkout provider.
    /// </summary>
    public required ExpressCheckoutCustomerDataDto CustomerData { get; set; }

    /// <summary>
    /// Optional provider-specific data from the SDK callback.
    /// </summary>
    public Dictionary<string, string>? ProviderData { get; set; }
}

/// <summary>
/// Customer data returned from express checkout.
/// </summary>
public class ExpressCheckoutCustomerDataDto
{
    /// <summary>
    /// Customer's email address.
    /// </summary>
    public required string Email { get; set; }

    /// <summary>
    /// Customer's phone number (optional).
    /// </summary>
    public string? Phone { get; set; }

    /// <summary>
    /// Customer's full name.
    /// </summary>
    public string? FullName { get; set; }

    /// <summary>
    /// Shipping address from express checkout.
    /// </summary>
    public required ExpressCheckoutAddressDto ShippingAddress { get; set; }

    /// <summary>
    /// Billing address. If null, billing is same as shipping.
    /// </summary>
    public ExpressCheckoutAddressDto? BillingAddress { get; set; }
}

/// <summary>
/// Address data from express checkout.
/// </summary>
public class ExpressCheckoutAddressDto
{
    /// <summary>
    /// Street address line 1.
    /// </summary>
    public required string Line1 { get; set; }

    /// <summary>
    /// Street address line 2 (apartment, suite, etc.).
    /// </summary>
    public string? Line2 { get; set; }

    /// <summary>
    /// City or locality.
    /// </summary>
    public required string City { get; set; }

    /// <summary>
    /// State, province, or region.
    /// </summary>
    public string? Region { get; set; }

    /// <summary>
    /// Postal or ZIP code.
    /// </summary>
    public required string PostalCode { get; set; }

    /// <summary>
    /// ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "CA").
    /// </summary>
    public required string CountryCode { get; set; }
}

/// <summary>
/// Response from processing an express checkout payment.
/// </summary>
public class ExpressCheckoutResponseDto
{
    /// <summary>
    /// Whether the payment was processed successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if the payment failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Error code from the provider (if any).
    /// </summary>
    public string? ErrorCode { get; set; }

    /// <summary>
    /// The invoice ID created for this order.
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// The payment ID if payment was recorded.
    /// </summary>
    public Guid? PaymentId { get; set; }

    /// <summary>
    /// The transaction ID from the payment provider.
    /// </summary>
    public string? TransactionId { get; set; }

    /// <summary>
    /// URL to redirect the customer to (confirmation page).
    /// </summary>
    public string? RedirectUrl { get; set; }

    /// <summary>
    /// Payment status (completed, pending, failed).
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// Correlation ID for error tracking and support troubleshooting.
    /// Populated when Success is false.
    /// </summary>
    public string? CorrelationId { get; set; }
}

/// <summary>
/// Configuration for initializing express checkout buttons.
/// </summary>
public class ExpressCheckoutConfigDto
{
    /// <summary>
    /// Currency code for the checkout (e.g., "GBP", "USD").
    /// </summary>
    public required string Currency { get; set; }

    /// <summary>
    /// Total amount for the checkout.
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Country code for the store (used for regional features).
    /// </summary>
    public string? CountryCode { get; set; }

    /// <summary>
    /// Available express checkout methods with their SDK configuration.
    /// </summary>
    public List<ExpressMethodConfigDto> Methods { get; set; } = [];
}

/// <summary>
/// Configuration for a specific express checkout method.
/// </summary>
public class ExpressMethodConfigDto
{
    /// <summary>
    /// The provider alias.
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The method alias.
    /// </summary>
    public required string MethodAlias { get; set; }

    /// <summary>
    /// Display name for the method.
    /// </summary>
    public required string DisplayName { get; set; }

    /// <summary>
    /// The method type (ApplePay, GooglePay, etc.).
    /// </summary>
    public PaymentMethodType? MethodType { get; set; }

    /// <summary>
    /// URL to load the provider's JavaScript SDK.
    /// </summary>
    public string? SdkUrl { get; set; }

    /// <summary>
    /// URL to load the provider's adapter script that handles button rendering and payment flow.
    /// The adapter registers with window.MerchelloExpressAdapters.
    /// </summary>
    public string? AdapterUrl { get; set; }

    /// <summary>
    /// Provider-specific SDK configuration.
    /// </summary>
    public Dictionary<string, object>? SdkConfig { get; set; }
}

/// <summary>
/// Request to create a PaymentIntent for express checkout.
/// </summary>
public class ExpressPaymentIntentRequestDto
{
    /// <summary>
    /// The payment provider alias (e.g., "stripe").
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The payment method alias (e.g., "applepay", "googlepay").
    /// </summary>
    public string? MethodAlias { get; set; }

    /// <summary>
    /// Optional amount override (otherwise uses basket total).
    /// </summary>
    public decimal? Amount { get; set; }

    /// <summary>
    /// Optional currency override (otherwise uses basket currency).
    /// </summary>
    public string? Currency { get; set; }
}

/// <summary>
/// Response from creating a PaymentIntent for express checkout.
/// </summary>
public class ExpressPaymentIntentResponseDto
{
    /// <summary>
    /// Whether the PaymentIntent was created successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if creation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// The client secret for confirming the payment.
    /// </summary>
    public string? ClientSecret { get; set; }

    /// <summary>
    /// The PaymentIntent ID for tracking.
    /// </summary>
    public string? PaymentIntentId { get; set; }

    /// <summary>
    /// Correlation ID for error tracking and support troubleshooting.
    /// Populated when Success is false.
    /// </summary>
    public string? CorrelationId { get; set; }
}

// =====================================================
// PayPal Widget Checkout DTOs
// =====================================================

/// <summary>
/// Request to create a PayPal order for the standard Widget payment flow.
/// Called by the PayPal button's createOrder callback.
/// </summary>
public class CreatePayPalOrderDto
{
    /// <summary>
    /// The payment session ID from the payment session creation.
    /// </summary>
    public string? SessionId { get; set; }
}

/// <summary>
/// Response from creating a PayPal order.
/// </summary>
public class CreatePayPalOrderResultDto
{
    /// <summary>
    /// Whether the order was created successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The PayPal order ID to return to the PayPal SDK.
    /// </summary>
    public string? OrderId { get; set; }

    /// <summary>
    /// Error message if creation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Correlation ID for error tracking and support troubleshooting.
    /// Populated when Success is false.
    /// </summary>
    public string? CorrelationId { get; set; }
}

/// <summary>
/// Request to capture an approved PayPal order.
/// Called after the user approves payment in the PayPal popup.
/// </summary>
public class CapturePayPalOrderDto
{
    /// <summary>
    /// The PayPal order ID that was approved.
    /// </summary>
    public required string OrderId { get; set; }

    /// <summary>
    /// The payment session ID from the payment session creation.
    /// </summary>
    public string? SessionId { get; set; }

    /// <summary>
    /// The invoice ID associated with this payment.
    /// Required for capturing the payment.
    /// </summary>
    public Guid? InvoiceId { get; set; }
}

/// <summary>
/// Response from capturing a PayPal order.
/// </summary>
public class CapturePayPalOrderResultDto
{
    /// <summary>
    /// Whether the payment was captured successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The invoice ID created for this order.
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// The payment ID if payment was recorded.
    /// </summary>
    public Guid? PaymentId { get; set; }

    /// <summary>
    /// The transaction ID from PayPal.
    /// </summary>
    public string? TransactionId { get; set; }

    /// <summary>
    /// URL to redirect the customer to (confirmation page).
    /// </summary>
    public string? RedirectUrl { get; set; }

    /// <summary>
    /// Error message if capture failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Correlation ID for error tracking and support troubleshooting.
    /// Populated when Success is false.
    /// </summary>
    public string? CorrelationId { get; set; }
}
