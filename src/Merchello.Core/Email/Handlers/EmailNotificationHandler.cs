using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Base;
using Merchello.Core.Notifications.CheckoutNotifications;
using Merchello.Core.Notifications.CustomerNotifications;
using Merchello.Core.Notifications.Inventory;
using Merchello.Core.Notifications.Invoice;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Notifications.Shipment;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Events;

namespace Merchello.Core.Email.Handlers;

/// <summary>
/// Notification handler that processes Merchello notifications and queues email deliveries.
/// Runs at priority 2000 (after all business logic) to ensure data is finalized before email generation.
/// </summary>
[NotificationHandlerPriority(2000)]
public class EmailNotificationHandler(
    IEmailConfigurationService configurationService,
    IEmailService emailService,
    IOptions<EmailSettings> options,
    ILogger<EmailNotificationHandler> logger)
    : INotificationAsyncHandler<OrderCreatedNotification>,
      INotificationAsyncHandler<OrderStatusChangedNotification>,
      INotificationAsyncHandler<InvoiceSavedNotification>,
      INotificationAsyncHandler<InvoiceDeletedNotification>,
      INotificationAsyncHandler<InvoiceCancelledNotification>,
      INotificationAsyncHandler<PaymentCreatedNotification>,
      INotificationAsyncHandler<PaymentRefundedNotification>,
      INotificationAsyncHandler<CustomerCreatedNotification>,
      INotificationAsyncHandler<CustomerPasswordResetRequestedNotification>,
      INotificationAsyncHandler<ShipmentCreatedNotification>,
      INotificationAsyncHandler<ShipmentSavedNotification>,
      INotificationAsyncHandler<LowStockNotification>,
      INotificationAsyncHandler<CheckoutAbandonedNotification>,
      INotificationAsyncHandler<CheckoutRecoveredNotification>,
      INotificationAsyncHandler<CheckoutRecoveryConvertedNotification>
{
    private readonly EmailSettings _settings = options.Value;

    #region Orders

    public Task HandleAsync(OrderCreatedNotification notification, CancellationToken ct)
        => ProcessEmailsAsync(Constants.EmailTopics.OrderCreated, notification, notification.Order.Id, "Order", ct);

    public Task HandleAsync(OrderStatusChangedNotification notification, CancellationToken ct)
        => ProcessEmailsAsync(Constants.EmailTopics.OrderStatusChanged, notification, notification.Order.Id, "Order", ct);

    #endregion

    #region Invoices

    public Task HandleAsync(InvoiceSavedNotification notification, CancellationToken ct)
        => ProcessEmailsAsync(Constants.EmailTopics.InvoiceCreated, notification, notification.Invoice.Id, "Invoice", ct);

    public Task HandleAsync(InvoiceDeletedNotification notification, CancellationToken ct)
        => ProcessEmailsAsync(Constants.EmailTopics.InvoiceDeleted, notification, notification.Invoice.Id, "Invoice", ct);

    public Task HandleAsync(InvoiceCancelledNotification notification, CancellationToken ct)
        => ProcessEmailsAsync(Constants.EmailTopics.OrderCancelled, notification, notification.Invoice.Id, "Invoice", ct);

    #endregion

    #region Payments

    public async Task HandleAsync(PaymentCreatedNotification notification, CancellationToken ct)
    {
        // Dispatch to both payment and invoice topics so either configuration works
        await ProcessEmailsAsync(Constants.EmailTopics.PaymentCreated, notification, notification.Payment.InvoiceId, "Payment", ct);
        await ProcessEmailsAsync(Constants.EmailTopics.InvoicePaid, notification, notification.Payment.InvoiceId, "Invoice", ct);
    }

    public async Task HandleAsync(PaymentRefundedNotification notification, CancellationToken ct)
    {
        // Dispatch to both payment and invoice topics so either configuration works
        await ProcessEmailsAsync(Constants.EmailTopics.PaymentRefunded, notification, notification.RefundPayment.InvoiceId, "Payment", ct);
        await ProcessEmailsAsync(Constants.EmailTopics.InvoiceRefunded, notification, notification.RefundPayment.InvoiceId, "Invoice", ct);
    }

    #endregion

    #region Customers

    public Task HandleAsync(CustomerCreatedNotification notification, CancellationToken ct)
        => ProcessEmailsAsync(Constants.EmailTopics.CustomerCreated, notification, notification.Customer.Id, "Customer", ct);

    public Task HandleAsync(CustomerPasswordResetRequestedNotification notification, CancellationToken ct)
        => ProcessEmailsAsync(Constants.EmailTopics.CustomerPasswordReset, notification, notification.Customer.Id, "Customer", ct);

    #endregion

    #region Shipments

    public Task HandleAsync(ShipmentCreatedNotification notification, CancellationToken ct)
        => ProcessEmailsAsync(Constants.EmailTopics.ShipmentCreated, notification, notification.Shipment.Id, "Shipment", ct);

    public Task HandleAsync(ShipmentSavedNotification notification, CancellationToken ct)
        => ProcessEmailsAsync(Constants.EmailTopics.ShipmentUpdated, notification, notification.Shipment.Id, "Shipment", ct);

    #endregion

    #region Inventory

    public Task HandleAsync(LowStockNotification notification, CancellationToken ct)
        => ProcessEmailsAsync(Constants.EmailTopics.InventoryLowStock, notification, notification.ProductId, "Product", ct);

    #endregion

    #region Checkout

    public Task HandleAsync(CheckoutAbandonedNotification notification, CancellationToken ct)
        => ProcessEmailsAsync(Constants.EmailTopics.CheckoutAbandoned, notification, notification.AbandonedCheckoutId, "AbandonedCheckout", ct);

    public Task HandleAsync(CheckoutRecoveredNotification notification, CancellationToken ct)
        => ProcessEmailsAsync(Constants.EmailTopics.CheckoutRecovered, notification, notification.AbandonedCheckoutId, "AbandonedCheckout", ct);

    public Task HandleAsync(CheckoutRecoveryConvertedNotification notification, CancellationToken ct)
        => ProcessEmailsAsync(Constants.EmailTopics.CheckoutConverted, notification, notification.InvoiceId, "Invoice", ct);

    #endregion

    /// <summary>
    /// Processes all email configurations for a given topic and queues deliveries.
    /// </summary>
    private async Task ProcessEmailsAsync<TNotification>(
        string topic,
        TNotification notification,
        Guid entityId,
        string entityType,
        CancellationToken ct) where TNotification : MerchelloNotification
    {
        if (!_settings.Enabled)
        {
            logger.LogDebug("Email system disabled, skipping dispatch for {Topic}", topic);
            return;
        }

        try
        {
            // Get all enabled email configurations for this topic
            var configurations = await configurationService.GetEnabledByTopicAsync(topic, ct);

            if (configurations.Count == 0)
            {
                logger.LogDebug("No email configurations found for topic {Topic}", topic);
                return;
            }

            logger.LogDebug("Found {Count} email configuration(s) for topic {Topic}", configurations.Count, topic);

            // Queue an email delivery for each configuration
            foreach (var config in configurations)
            {
                try
                {
                    await emailService.QueueDeliveryAsync(config, notification, entityId, entityType, ct);
                }
                catch (Exception ex)
                {
                    // Don't let one failed queue break the others
                    logger.LogError(ex,
                        "Failed to queue email for configuration {ConfigurationId} ({ConfigurationName})",
                        config.Id, config.Name);
                }
            }
        }
        catch (Exception ex)
        {
            // Never let email failures break the main operation
            logger.LogError(ex, "Failed to process emails for topic {Topic}", topic);
        }
    }
}
