using Merchello.Core.Payments.Models;

namespace Merchello.Controllers.Dtos;

/// <summary>
/// Payment record DTO
/// </summary>
public class PaymentDto
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public decimal Amount { get; set; }
    public string? PaymentMethod { get; set; }
    public string? PaymentProviderAlias { get; set; }
    public PaymentType PaymentType { get; set; }
    public string? TransactionId { get; set; }
    public string? Description { get; set; }
    public bool PaymentSuccess { get; set; }
    public string? RefundReason { get; set; }
    public Guid? ParentPaymentId { get; set; }
    public DateTime DateCreated { get; set; }

    /// <summary>
    /// Child refund payments (if any)
    /// </summary>
    public List<PaymentDto>? Refunds { get; set; }

    /// <summary>
    /// Calculated refundable amount (original amount minus existing refunds)
    /// </summary>
    public decimal RefundableAmount { get; set; }
}

/// <summary>
/// Invoice payment status response
/// </summary>
public class PaymentStatusDto
{
    public Guid InvoiceId { get; set; }
    public InvoicePaymentStatus Status { get; set; }
    public string StatusDisplay { get; set; } = string.Empty;
    public decimal InvoiceTotal { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal TotalRefunded { get; set; }
    public decimal NetPayment { get; set; }
    public decimal BalanceDue { get; set; }
}

/// <summary>
/// Request to record a manual/offline payment
/// </summary>
public class RecordManualPaymentDto
{
    /// <summary>
    /// Payment amount
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Payment method description (e.g., "Cash", "Check", "Bank Transfer")
    /// </summary>
    public required string PaymentMethod { get; set; }

    /// <summary>
    /// Optional description/notes
    /// </summary>
    public string? Description { get; set; }
}

/// <summary>
/// Request to process a refund
/// </summary>
public class ProcessRefundDto
{
    /// <summary>
    /// Amount to refund. If null or 0, refunds the full refundable amount.
    /// </summary>
    public decimal? Amount { get; set; }

    /// <summary>
    /// Reason for the refund (required)
    /// </summary>
    public required string Reason { get; set; }

    /// <summary>
    /// If true, records a manual refund without calling the provider.
    /// Use when refund has already been processed externally.
    /// </summary>
    public bool IsManualRefund { get; set; }
}

/// <summary>
/// Request to initiate a payment
/// </summary>
public class InitiatePaymentDto
{
    /// <summary>
    /// The payment provider alias to use
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// URL to redirect to after successful payment
    /// </summary>
    public required string ReturnUrl { get; set; }

    /// <summary>
    /// URL to redirect to if payment is cancelled
    /// </summary>
    public required string CancelUrl { get; set; }
}

/// <summary>
/// Response from payment session creation
/// </summary>
public class PaymentSessionResponseDto
{
    /// <summary>
    /// Whether the session was created successfully
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Session identifier
    /// </summary>
    public string? SessionId { get; set; }

    /// <summary>
    /// How the frontend should handle this payment
    /// </summary>
    public PaymentIntegrationType IntegrationType { get; set; }

    /// <summary>
    /// URL to redirect customer to for payment (Redirect type)
    /// </summary>
    public string? RedirectUrl { get; set; }

    /// <summary>
    /// Client token for JS SDK initialization (HostedFields/Widget types)
    /// </summary>
    public string? ClientToken { get; set; }

    /// <summary>
    /// Client secret for Stripe-style integrations
    /// </summary>
    public string? ClientSecret { get; set; }

    /// <summary>
    /// URL to the payment provider's JavaScript SDK
    /// </summary>
    public string? JavaScriptSdkUrl { get; set; }

    /// <summary>
    /// SDK configuration object
    /// </summary>
    public Dictionary<string, object>? SdkConfiguration { get; set; }

    /// <summary>
    /// Form fields for DirectForm type
    /// </summary>
    public List<CheckoutFormFieldDto>? FormFields { get; set; }

    /// <summary>
    /// Error message if not successful
    /// </summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Checkout form field definition
/// </summary>
public class CheckoutFormFieldDto
{
    public required string Key { get; set; }
    public required string Label { get; set; }
    public string? Description { get; set; }
    public required string FieldType { get; set; }
    public bool IsRequired { get; set; }
    public string? DefaultValue { get; set; }
    public string? Placeholder { get; set; }
    public string? ValidationPattern { get; set; }
    public string? ValidationMessage { get; set; }
    public List<SelectOptionDto>? Options { get; set; }
}

/// <summary>
/// Payment method available for checkout
/// </summary>
public class PaymentMethodDto
{
    public required string Alias { get; set; }
    public required string DisplayName { get; set; }
    public string? Icon { get; set; }
    public string? Description { get; set; }
    public PaymentIntegrationType IntegrationType { get; set; }
    public int SortOrder { get; set; }
}

/// <summary>
/// Query parameters for payment return/cancel handling
/// </summary>
public class PaymentReturnQuery
{
    /// <summary>
    /// Invoice ID
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// Transaction ID from the provider
    /// </summary>
    public string? TransactionId { get; set; }

    /// <summary>
    /// Session ID (provider-specific)
    /// </summary>
    public string? SessionId { get; set; }

    /// <summary>
    /// Provider alias
    /// </summary>
    public string? Provider { get; set; }
}

/// <summary>
/// Payment return/cancel response
/// </summary>
public class PaymentReturnResponseDto
{
    /// <summary>
    /// Whether the payment was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Status message
    /// </summary>
    public string? Message { get; set; }

    /// <summary>
    /// Invoice ID if available
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// Payment ID if payment was recorded
    /// </summary>
    public Guid? PaymentId { get; set; }
}

