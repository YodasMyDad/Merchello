using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Fulfilment;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Notifications;
using Merchello.Core.Fulfilment.Providers.SupplierDirect;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Models;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Fulfilment.Services.Parameters;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Warehouses.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Fulfilment.Services;

/// <summary>
/// Coordinates trigger-aware order submission to fulfilment providers.
/// </summary>
public class FulfilmentSubmissionService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IFulfilmentService fulfilmentService,
    IPaymentService paymentService,
    IWarehouseService warehouseService,
    IMerchelloNotificationPublisher notificationPublisher,
    IOptions<FulfilmentSettings> settings,
    ILogger<FulfilmentSubmissionService> logger) : IFulfilmentSubmissionService
{
    private readonly FulfilmentSettings _settings = settings.Value;

    public async Task<CrudResult<Order>> SubmitOrderAsync(
        SubmitFulfilmentOrderParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Order>();
        var order = await GetOrderAsync(parameters.OrderId, cancellationToken);

        if (order == null)
        {
            result.AddErrorMessage($"Order {parameters.OrderId} not found.");
            return result;
        }

        result.ResultObject = order;

        // Idempotency: return success with warning so callers can treat it as a no-op.
        if (!string.IsNullOrWhiteSpace(order.FulfilmentProviderReference))
        {
            result.AddWarningMessage("Order has already been submitted to fulfilment provider.");
            return result;
        }

        if (order.Status is OrderStatus.Cancelled or OrderStatus.OnHold)
        {
            AddPolicyMessage(result, parameters.Source, $"Order is {order.Status} and cannot be submitted to fulfilment.");
            return result;
        }

        var providerConfig = await fulfilmentService.ResolveProviderForWarehouseAsync(order.WarehouseId, cancellationToken);
        if (providerConfig == null)
        {
            AddPolicyMessage(result, parameters.Source, "No fulfilment provider configured for this order.");
            return result;
        }

        var isSupplierDirect = string.Equals(
            providerConfig.ProviderKey,
            SupplierDirectProviderDefaults.ProviderKey,
            StringComparison.OrdinalIgnoreCase);

        if (!isSupplierDirect && parameters.Source == FulfilmentSubmissionSource.ExplicitRelease)
        {
            result.AddErrorMessage("Explicit release is only supported for Supplier Direct fulfilment.");
            return result;
        }

        if (isSupplierDirect)
        {
            var trigger = await ResolveSupplierDirectSubmissionTriggerAsync(order.WarehouseId, cancellationToken);
            if (!IsSourceAllowedForTrigger(trigger, parameters.Source))
            {
                AddPolicyMessage(
                    result,
                    parameters.Source,
                    trigger == SupplierDirectSubmissionTrigger.OnPaid
                        ? "Supplier Direct is configured to submit on payment for this supplier."
                        : "Supplier Direct is configured for explicit release for this supplier.");
                return result;
            }
        }

        if (parameters.RequirePaidInvoice)
        {
            var paymentStatus = await paymentService.GetInvoicePaymentStatusAsync(order.InvoiceId, cancellationToken);
            if (paymentStatus != InvoicePaymentStatus.Paid)
            {
                AddPolicyMessage(
                    result,
                    parameters.Source,
                    $"Invoice is not fully paid. Current payment status is {paymentStatus}.");
                return result;
            }
        }

        var submittingNotification = new FulfilmentSubmittingNotification(order, providerConfig);
        var wasCancelled = await notificationPublisher.PublishCancelableAsync(submittingNotification, cancellationToken);

        if (wasCancelled || submittingNotification.Cancel)
        {
            AddPolicyMessage(
                result,
                parameters.Source,
                submittingNotification.CancelReason ?? "Fulfilment submission was cancelled.");
            return result;
        }

        var submitResult = await fulfilmentService.SubmitOrderAsync(order.Id, cancellationToken);
        result.ResultObject = submitResult.ResultObject ?? order;
        result.Messages.AddRange(submitResult.Messages);

        await PublishSubmissionNotificationsAsync(submitResult, providerConfig, cancellationToken);
        return result;
    }

    private async Task<Order?> GetOrderAsync(Guid orderId, CancellationToken cancellationToken)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var order = await scope.ExecuteWithContextAsync(async db =>
            await db.Orders
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken));
        scope.Complete();
        return order;
    }

    private async Task PublishSubmissionNotificationsAsync(
        CrudResult<Order> submitResult,
        FulfilmentProviderConfiguration providerConfig,
        CancellationToken cancellationToken)
    {
        if (submitResult.Success &&
            !string.IsNullOrWhiteSpace(submitResult.ResultObject?.FulfilmentProviderReference))
        {
            await notificationPublisher.PublishAsync(
                new FulfilmentSubmittedNotification(submitResult.ResultObject, providerConfig),
                cancellationToken);
            return;
        }

        if (submitResult.ResultObject?.Status == OrderStatus.FulfilmentFailed)
        {
            await notificationPublisher.PublishAsync(
                new FulfilmentSubmissionFailedNotification(
                    submitResult.ResultObject,
                    providerConfig,
                    submitResult.Messages.FirstOrDefault()?.Message
                        ?? submitResult.ResultObject.FulfilmentErrorMessage
                        ?? "Unknown error"),
                cancellationToken);
            return;
        }

        // Preserve legacy handler behavior: any non-terminal outcome that did not return
        // a submitted reference should publish an attempt-failed notification for timeline visibility.
        if (submitResult.ResultObject != null)
        {
            await notificationPublisher.PublishAsync(
                new FulfilmentSubmissionAttemptFailedNotification(
                    submitResult.ResultObject,
                    providerConfig,
                    submitResult.Messages.FirstOrDefault()?.Message
                        ?? submitResult.ResultObject.FulfilmentErrorMessage
                        ?? "Unknown error",
                    submitResult.ResultObject.FulfilmentRetryCount,
                    _settings.MaxRetryAttempts),
                cancellationToken);
        }
    }

    private static bool IsSourceAllowedForTrigger(
        SupplierDirectSubmissionTrigger trigger,
        FulfilmentSubmissionSource source) =>
        (trigger, source) switch
        {
            (SupplierDirectSubmissionTrigger.OnPaid, FulfilmentSubmissionSource.PaymentCreated) => true,
            (SupplierDirectSubmissionTrigger.ExplicitRelease, FulfilmentSubmissionSource.ExplicitRelease) => true,
            _ => false
        };

    private async Task<SupplierDirectSubmissionTrigger> ResolveSupplierDirectSubmissionTriggerAsync(
        Guid warehouseId,
        CancellationToken cancellationToken)
    {
        var warehouse = await warehouseService.GetWarehouseByIdAsync(warehouseId, cancellationToken);
        if (warehouse?.Supplier?.ExtendedData?.TryGetValue(SupplierDirectExtendedDataKeys.Profile, out var profileRaw) == true)
        {
            var profileJson = profileRaw.UnwrapJsonElement()?.ToString();
            var profile = SupplierDirectProfile.FromJson(profileJson);
            if (profile != null)
            {
                return profile.SubmissionTrigger;
            }
        }

        return SupplierDirectSubmissionTrigger.OnPaid;
    }

    private void AddPolicyMessage(
        CrudResult<Order> result,
        FulfilmentSubmissionSource source,
        string message)
    {
        if (source == FulfilmentSubmissionSource.ExplicitRelease)
        {
            result.AddErrorMessage(message);
            logger.LogInformation("Fulfilment explicit release blocked: {Message}", message);
            return;
        }

        result.AddWarningMessage(message);
        logger.LogDebug("Fulfilment auto-submission skipped: {Message}", message);
    }
}
