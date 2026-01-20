using Merchello.Core.Payments.Models;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Payments.Services.Interfaces;

/// <summary>
/// Service for creating and managing payment links for invoices.
/// Payment links allow staff to generate shareable URLs for customers to pay invoices.
/// </summary>
public interface IPaymentLinkService
{
    /// <summary>
    /// Create a payment link for an invoice using the specified provider.
    /// The link URL and provider info are stored in Invoice.ExtendedData.
    /// </summary>
    /// <param name="invoiceId">The invoice to create a payment link for.</param>
    /// <param name="providerAlias">The payment provider to use (e.g., "stripe", "paypal").</param>
    /// <param name="createdBy">Optional username of the staff member creating the link.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result containing the payment link info.</returns>
    Task<CrudResult<PaymentLinkInfo>> CreatePaymentLinkAsync(
        Guid invoiceId,
        string providerAlias,
        string? createdBy = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get the current payment link for an invoice (if any).
    /// </summary>
    /// <param name="invoiceId">The invoice ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Payment link info, or null if no active link exists.</returns>
    Task<PaymentLinkInfo?> GetPaymentLinkForInvoiceAsync(
        Guid invoiceId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deactivate the payment link for an invoice.
    /// This calls the provider to deactivate the link and clears the stored data.
    /// </summary>
    /// <param name="invoiceId">The invoice ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result indicating success or failure.</returns>
    Task<CrudResult<bool>> DeactivatePaymentLinkAsync(
        Guid invoiceId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all payment providers that support payment links.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of provider metadata for providers that support payment links.</returns>
    Task<IReadOnlyList<PaymentLinkProviderInfo>> GetPaymentLinkProvidersAsync(
        CancellationToken cancellationToken = default);
}
