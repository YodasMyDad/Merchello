using Merchello.Core.Accounting.Models;
using Merchello.Core.Payments.Models;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Payments.Services;

/// <summary>
/// Service for handling payment operations.
/// </summary>
public interface IPaymentService
{
    /// <summary>
    /// Create a payment session for an invoice using a specific provider.
    /// Returns what the frontend needs to render the payment UI (redirect URL, client token, or form fields).
    /// </summary>
    /// <param name="invoiceId">The invoice ID to pay.</param>
    /// <param name="providerAlias">The payment provider alias to use.</param>
    /// <param name="returnUrl">URL to redirect to after successful payment.</param>
    /// <param name="cancelUrl">URL to redirect to if payment is cancelled.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Session result containing what the frontend needs for the payment flow.</returns>
    Task<PaymentSessionResult> CreatePaymentSessionAsync(
        Guid invoiceId,
        string providerAlias,
        string returnUrl,
        string cancelUrl,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Process a payment after client-side interaction (redirect return, token submission, or form submission).
    /// </summary>
    /// <param name="request">The payment processing request with tokens/form data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result of the payment processing.</returns>
    Task<CrudResult<Payment>> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Record a successful payment (typically called from webhook or return URL handler).
    /// </summary>
    /// <param name="invoiceId">The invoice ID.</param>
    /// <param name="providerAlias">The payment provider alias.</param>
    /// <param name="transactionId">Transaction ID from the provider.</param>
    /// <param name="amount">Payment amount.</param>
    /// <param name="description">Optional description.</param>
    /// <param name="fraudResponse">Optional fraud check response.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result containing the created payment record.</returns>
    Task<CrudResult<Payment>> RecordPaymentAsync(
        Guid invoiceId,
        string providerAlias,
        string transactionId,
        decimal amount,
        string? description = null,
        string? fraudResponse = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Process a refund for an existing payment.
    /// </summary>
    /// <param name="paymentId">The original payment ID to refund.</param>
    /// <param name="amount">Amount to refund (null for full refund).</param>
    /// <param name="reason">Reason for the refund.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result containing the refund payment record (negative amount).</returns>
    Task<CrudResult<Payment>> ProcessRefundAsync(
        Guid paymentId,
        decimal? amount,
        string reason,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all payments for an invoice.
    /// </summary>
    /// <param name="invoiceId">The invoice ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>All payments including refunds for the invoice.</returns>
    Task<IEnumerable<Payment>> GetPaymentsForInvoiceAsync(
        Guid invoiceId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get a payment by ID.
    /// </summary>
    /// <param name="paymentId">The payment ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The payment, or null if not found.</returns>
    Task<Payment?> GetPaymentAsync(
        Guid paymentId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get a payment by transaction ID.
    /// </summary>
    /// <param name="transactionId">The provider transaction ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The payment, or null if not found.</returns>
    Task<Payment?> GetPaymentByTransactionIdAsync(
        string transactionId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculate the payment status for an invoice.
    /// </summary>
    /// <param name="invoiceId">The invoice ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The calculated payment status.</returns>
    Task<InvoicePaymentStatus> GetInvoicePaymentStatusAsync(
        Guid invoiceId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculate payment status details from a list of payments.
    /// This is the single source of truth for payment status calculations.
    /// Use this when you already have payments loaded.
    /// </summary>
    /// <param name="payments">The payments for the invoice.</param>
    /// <param name="invoiceTotal">The invoice total amount.</param>
    /// <returns>Full payment status details including totals and balance.</returns>
    PaymentStatusDetails CalculatePaymentStatus(IEnumerable<Payment> payments, decimal invoiceTotal);

    /// <summary>
    /// Record a manual/offline payment (for backoffice use).
    /// </summary>
    /// <param name="invoiceId">The invoice ID.</param>
    /// <param name="amount">Payment amount.</param>
    /// <param name="paymentMethod">Payment method description (e.g., "Cash", "Check", "Bank Transfer").</param>
    /// <param name="description">Optional description/notes.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result containing the created payment record.</returns>
    Task<CrudResult<Payment>> RecordManualPaymentAsync(
        Guid invoiceId,
        decimal amount,
        string paymentMethod,
        string? description = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Record a manual refund (for backoffice use when provider refund already processed externally).
    /// </summary>
    /// <param name="paymentId">The original payment ID.</param>
    /// <param name="amount">Refund amount.</param>
    /// <param name="reason">Reason for the refund.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result containing the refund payment record.</returns>
    Task<CrudResult<Payment>> RecordManualRefundAsync(
        Guid paymentId,
        decimal amount,
        string reason,
        CancellationToken cancellationToken = default);
}

