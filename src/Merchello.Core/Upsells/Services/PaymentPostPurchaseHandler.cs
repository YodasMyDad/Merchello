using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Events;

namespace Merchello.Core.Upsells.Services;

/// <summary>
/// Notification handler that initializes post-purchase upsell flows for non-checkout
/// payment flows (webhooks, API-created payments). Checkout flows call
/// InitializePostPurchaseAsync directly from the controller.
/// </summary>
[NotificationHandlerPriority(1900)]
public class PaymentPostPurchaseHandler(
    IPostPurchaseUpsellService postPurchaseUpsellService,
    IPaymentProviderManager paymentProviderManager,
    IOptions<UpsellSettings> upsellSettings,
    ILogger<PaymentPostPurchaseHandler> logger)
    : INotificationAsyncHandler<PaymentCreatedNotification>
{
    public async Task HandleAsync(PaymentCreatedNotification notification, CancellationToken ct)
    {
        try
        {
            if (!upsellSettings.Value.EnablePostPurchase)
                return;

            var payment = notification.Payment;

            if (payment.PaymentType != PaymentType.Payment || !payment.PaymentSuccess)
                return;

            // Avoid re-triggering for post-purchase upsell charges
            if (string.Equals(payment.Description, "Post-purchase upsell", StringComparison.OrdinalIgnoreCase))
                return;

            if (string.IsNullOrWhiteSpace(payment.PaymentProviderAlias))
                return;

            var provider = await paymentProviderManager.GetProviderAsync(
                payment.PaymentProviderAlias, requireEnabled: false, ct);

            if (provider?.Metadata.SupportsVaultedPayments != true ||
                provider.Setting?.IsVaultingEnabled != true)
            {
                return;
            }

            await postPurchaseUpsellService.InitializePostPurchaseAsync(
                new InitializePostPurchaseParameters
                {
                    InvoiceId = payment.InvoiceId,
                    ProviderAlias = payment.PaymentProviderAlias,
                }, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to initialize post-purchase upsells for invoice {InvoiceId}.", notification.Payment.InvoiceId);
        }
    }
}
