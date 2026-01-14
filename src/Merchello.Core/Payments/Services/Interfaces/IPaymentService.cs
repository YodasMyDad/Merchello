using Merchello.Core.Accounting.Models;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Payments.Services.Interfaces;

/// <summary>
/// Service for handling payment operations.
/// </summary>
public interface IPaymentService
{
    /// <summary>
    /// Create a payment session for an invoice using a specific provider.
    /// Returns what the frontend needs to render the payment UI (redirect URL, client token, or form fields).
    /// </summary>
    /// <param name="parameters">The payment session parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Session result containing what the frontend needs for the payment flow.</returns>
    Task<PaymentSessionResult> CreatePaymentSessionAsync(
        CreatePaymentSessionParameters parameters,
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
    /// <param name="parameters">The payment recording parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result containing the created payment record.</returns>
    Task<CrudResult<Payment>> RecordPaymentAsync(
        RecordPaymentParameters parameters,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Process a refund for an existing payment.
    /// </summary>
    /// <param name="parameters">Parameters for the refund.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result containing the refund payment record (negative amount).</returns>
    Task<CrudResult<Payment>> ProcessRefundAsync(
        ProcessRefundParameters parameters,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Preview a refund calculation without processing it.
    /// Returns the calculated refund amount and provider capabilities.
    /// </summary>
    /// <param name="parameters">Parameters for the refund preview.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result containing the refund preview details.</returns>
    Task<CrudResult<RefundPreviewDto>> PreviewRefundAsync(
        PreviewRefundParameters parameters,
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
    /// Supports both single-currency and multi-currency scenarios via optional parameters.
    /// </summary>
    /// <param name="parameters">Parameters for calculating payment status.</param>
    /// <returns>Full payment status details including totals and balance.</returns>
    PaymentStatusDetails CalculatePaymentStatus(CalculatePaymentStatusParameters parameters);

    /// <summary>
    /// Record a manual/offline payment (for backoffice use).
    /// </summary>
    /// <param name="parameters">The manual payment parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result containing the created payment record.</returns>
    Task<CrudResult<Payment>> RecordManualPaymentAsync(
        RecordManualPaymentParameters parameters,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Record a manual refund (for backoffice use when provider refund already processed externally).
    /// </summary>
    /// <param name="parameters">Parameters for the manual refund.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result containing the refund payment record.</returns>
    Task<CrudResult<Payment>> RecordManualRefundAsync(
        RecordManualRefundParameters parameters,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Mark multiple invoices as paid in a single batch operation.
    /// Creates one payment per invoice for its outstanding balance.
    /// Used for recording offline payments received (bank transfers, cheques, etc.).
    /// </summary>
    /// <param name="parameters">Batch payment parameters including invoice IDs and payment details.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result containing list of created payments, or errors if any invoices failed.</returns>
    Task<CrudResult<List<Payment>>> BatchMarkAsPaidAsync(
        BatchMarkAsPaidParameters parameters,
        CancellationToken cancellationToken = default);
}
