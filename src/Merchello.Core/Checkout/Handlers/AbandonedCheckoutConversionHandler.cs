using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Payments.Models;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;

namespace Merchello.Core.Checkout.Handlers;

/// <summary>
/// Marks tracked checkouts as converted only after a successful payment is recorded.
/// This prevents pre-payment invoice creation from prematurely ending abandoned-cart recovery.
/// </summary>
[NotificationHandlerPriority(1500)]
public class AbandonedCheckoutConversionHandler(
    IAbandonedCheckoutService abandonedCheckoutService,
    IInvoiceService invoiceService,
    ILogger<AbandonedCheckoutConversionHandler> logger)
    : INotificationAsyncHandler<PaymentCreatedNotification>
{
    public async Task HandleAsync(PaymentCreatedNotification notification, CancellationToken ct)
    {
        try
        {
            var payment = notification.Payment;
            if (!payment.PaymentSuccess || payment.PaymentType != PaymentType.Payment)
            {
                return;
            }

            var invoice = await invoiceService.GetInvoiceAsync(payment.InvoiceId, ct);
            if (invoice?.BasketId == null)
            {
                return;
            }

            var abandonedCheckout = await abandonedCheckoutService.GetByBasketIdAsync(invoice.BasketId.Value, ct);
            if (abandonedCheckout == null)
            {
                return;
            }

            if (abandonedCheckout.Status is AbandonedCheckoutStatus.Converted or AbandonedCheckoutStatus.Expired)
            {
                return;
            }

            await abandonedCheckoutService.MarkAsConvertedAsync(abandonedCheckout.Id, invoice.Id, ct);

            logger.LogDebug(
                "Marked abandoned checkout {AbandonedCheckoutId} as converted after successful payment for invoice {InvoiceId}.",
                abandonedCheckout.Id,
                invoice.Id);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to mark abandoned checkout as converted for invoice {InvoiceId}.", notification.Payment.InvoiceId);
        }
    }
}
