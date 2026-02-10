using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Fulfilment.Notifications;
using Merchello.Core.Fulfilment.Providers.SupplierDirect;
using Merchello.Core.Notifications;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;

namespace Merchello.Core.Fulfilment.Handlers;

/// <summary>
/// Adds timeline notes to invoices for fulfilment lifecycle events.
/// Runs at priority 2000 (same as other timeline handlers) to ensure timeline entries
/// are added before email/webhook dispatch.
/// </summary>
[NotificationHandlerPriority(2000)]
public class FulfilmentTimelineHandler(
    IInvoiceService invoiceService,
    ILogger<FulfilmentTimelineHandler> logger)
    : INotificationAsyncHandler<FulfilmentSubmittedNotification>,
      INotificationAsyncHandler<FulfilmentSubmissionFailedNotification>,
      INotificationAsyncHandler<FulfilmentSubmissionAttemptFailedNotification>
{
    public async Task HandleAsync(FulfilmentSubmittedNotification notification, CancellationToken ct)
    {
        var order = notification.Order;
        var reference = order.FulfilmentProviderReference;

        try
        {
            // Determine delivery method from reference format and create appropriate note
            var description = reference switch
            {
                _ when reference?.StartsWith("email:") == true =>
                    $"Supplier order queued via email (Delivery: {reference[6..]})",
                _ when reference?.StartsWith("ftp:") == true =>
                    $"Supplier order uploaded to {ExtractFtpPath(reference)}",
                _ when reference?.StartsWith("sftp:") == true =>
                    $"Supplier order uploaded via SFTP to {ExtractFtpPath(reference)}",
                _ => $"Order submitted to fulfilment provider (Reference: {reference})"
            };

            await AddTimelineNoteAsync(order.InvoiceId, description, ct);
        }
        catch (Exception ex)
        {
            // Don't let timeline failures break the main operation
            logger.LogWarning(ex, "Failed to add timeline entry for fulfilment submission on order {OrderId}", order.Id);
        }
    }

    public async Task HandleAsync(FulfilmentSubmissionFailedNotification notification, CancellationToken ct)
    {
        var order = notification.Order;

        try
        {
            var description = $"Supplier order permanently failed after {order.FulfilmentRetryCount} attempt(s): {notification.ErrorMessage}";

            await AddTimelineNoteAsync(order.InvoiceId, description, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to add timeline entry for fulfilment failure on order {OrderId}", order.Id);
        }
    }

    public async Task HandleAsync(FulfilmentSubmissionAttemptFailedNotification notification, CancellationToken ct)
    {
        var order = notification.Order;

        try
        {
            var description =
                $"Supplier order submission failed (attempt {notification.AttemptNumber}/{notification.MaxAttempts}): {notification.ErrorMessage}";

            await AddTimelineNoteAsync(order.InvoiceId, description, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to add timeline entry for fulfilment attempt failure on order {OrderId}", order.Id);
        }
    }

    private async Task AddTimelineNoteAsync(Guid invoiceId, string description, CancellationToken ct)
    {
        var safeDescription = SupplierDirectSecretRedactor.RedactSecrets(description);

        var parameters = new AddInvoiceNoteParameters
        {
            InvoiceId = invoiceId,
            Text = safeDescription,
            VisibleToCustomer = false,
            AuthorName = "System"
        };

        var result = await invoiceService.AddNoteAsync(parameters, ct);

        if (result.Success)
        {
            logger.LogDebug("Added fulfilment timeline note for invoice {InvoiceId}: {Description}",
                invoiceId, safeDescription);
        }
        else
        {
            logger.LogWarning("Failed to add fulfilment timeline note for invoice {InvoiceId}: {Error}",
                invoiceId, result.Messages.FirstOrDefault()?.Message ?? "Unknown error");
        }
    }

    private static string ExtractFtpPath(string reference)
    {
        // Reference format: "ftp:{remotePath}/{fileName}" or "sftp:{remotePath}/{fileName}"
        var colonIndex = reference.IndexOf(':');
        if (colonIndex >= 0 && colonIndex < reference.Length - 1)
        {
            return reference[(colonIndex + 1)..];
        }
        return reference;
    }
}
