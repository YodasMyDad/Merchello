using Merchello.Core.DigitalProducts.Notifications;
using Merchello.Core.Fulfilment.Notifications;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.BasketNotifications;
using Merchello.Core.Notifications.CheckoutNotifications;
using Merchello.Core.Notifications.CustomerNotifications;
using Merchello.Core.Notifications.DiscountNotifications;
using Merchello.Core.Notifications.Inventory;
using Merchello.Core.Notifications.Invoice;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Notifications.Product;
using Merchello.Core.Notifications.Shipment;
using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Events;

namespace Merchello.Core.Webhooks.Handlers;

/// <summary>
/// Notification handler that bridges internal Merchello notifications to external webhook deliveries.
/// Runs at priority 2200 (after timeline logging and email) to ensure data is finalized before dispatch.
/// </summary>
[NotificationHandlerPriority(2200)]
public class WebhookNotificationHandler(
    IWebhookService webhookService,
    IOptions<WebhookSettings> options,
    ILogger<WebhookNotificationHandler> logger)
    : INotificationAsyncHandler<OrderCreatedNotification>,
      INotificationAsyncHandler<OrderSavedNotification>,
      INotificationAsyncHandler<OrderStatusChangedNotification>,
      INotificationAsyncHandler<InvoiceSavedNotification>,
      INotificationAsyncHandler<InvoiceDeletedNotification>,
      INotificationAsyncHandler<InvoiceCancelledNotification>,
      INotificationAsyncHandler<PaymentCreatedNotification>,
      INotificationAsyncHandler<PaymentRefundedNotification>,
      INotificationAsyncHandler<ProductCreatedNotification>,
      INotificationAsyncHandler<ProductSavedNotification>,
      INotificationAsyncHandler<ProductDeletedNotification>,
      INotificationAsyncHandler<CustomerCreatedNotification>,
      INotificationAsyncHandler<CustomerSavedNotification>,
      INotificationAsyncHandler<CustomerDeletedNotification>,
      INotificationAsyncHandler<ShipmentCreatedNotification>,
      INotificationAsyncHandler<ShipmentSavedNotification>,
      INotificationAsyncHandler<DiscountCreatedNotification>,
      INotificationAsyncHandler<DiscountSavedNotification>,
      INotificationAsyncHandler<DiscountDeletedNotification>,
      INotificationAsyncHandler<StockAdjustedNotification>,
      INotificationAsyncHandler<LowStockNotification>,
      INotificationAsyncHandler<StockReservedNotification>,
      INotificationAsyncHandler<StockAllocatedNotification>,
      INotificationAsyncHandler<BasketCreatedNotification>,
      INotificationAsyncHandler<BasketItemAddedNotification>,
      INotificationAsyncHandler<BasketItemRemovedNotification>,
      INotificationAsyncHandler<BasketItemQuantityChangedNotification>,
      INotificationAsyncHandler<BasketClearedNotification>,
      INotificationAsyncHandler<CheckoutAbandonedNotification>,
      INotificationAsyncHandler<CheckoutAbandonedFirstNotification>,
      INotificationAsyncHandler<CheckoutAbandonedReminderNotification>,
      INotificationAsyncHandler<CheckoutAbandonedFinalNotification>,
      INotificationAsyncHandler<CheckoutRecoveredNotification>,
      INotificationAsyncHandler<CheckoutRecoveryConvertedNotification>,
      INotificationAsyncHandler<DigitalProductDeliveredNotification>,
      INotificationAsyncHandler<FulfilmentSubmittedNotification>,
      INotificationAsyncHandler<FulfilmentSubmissionFailedNotification>,
      INotificationAsyncHandler<FulfilmentInventoryUpdatedNotification>,
      INotificationAsyncHandler<FulfilmentProductSyncedNotification>
{
    private readonly WebhookSettings _settings = options.Value;

    #region Orders

    public Task HandleAsync(OrderCreatedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.OrderCreated, new
        {
            notification.Order.Id,
            notification.Order.InvoiceId,
            notification.Order.Status,
            notification.Order.DateCreated
        }, notification.Order.Id, "Order", ct);

    public Task HandleAsync(OrderSavedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.OrderUpdated, new
        {
            notification.Order.Id,
            notification.Order.InvoiceId,
            notification.Order.Status,
            notification.Order.DateUpdated
        }, notification.Order.Id, "Order", ct);

    public Task HandleAsync(OrderStatusChangedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.OrderStatusChanged, new
        {
            Order = new
            {
                notification.Order.Id,
                notification.Order.InvoiceId,
                notification.Order.Status
            },
            PreviousStatus = notification.OldStatus.ToString(),
            NewStatus = notification.NewStatus.ToString(),
            notification.Reason
        }, notification.Order.Id, "Order", ct);

    #endregion

    #region Invoices

    public Task HandleAsync(InvoiceSavedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.InvoiceCreated, new
        {
            notification.Invoice.Id,
            notification.Invoice.InvoiceNumber,
            notification.Invoice.Total,
            notification.Invoice.DateCreated
        }, notification.Invoice.Id, "Invoice", ct);

    public Task HandleAsync(InvoiceDeletedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.InvoiceDeleted, new
        {
            notification.Invoice.Id,
            notification.Invoice.InvoiceNumber
        }, notification.Invoice.Id, "Invoice", ct);

    public Task HandleAsync(InvoiceCancelledNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.OrderCancelled, new
        {
            notification.Invoice.Id,
            notification.Invoice.InvoiceNumber,
            notification.Reason
        }, notification.Invoice.Id, "Invoice", ct);

    #endregion

    #region Payments

    public Task HandleAsync(PaymentCreatedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.InvoicePaid, new
        {
            notification.Payment.Id,
            notification.Payment.InvoiceId,
            notification.Payment.Amount,
            notification.Payment.PaymentSuccess,
            notification.Payment.PaymentProviderAlias
        }, notification.Payment.InvoiceId, "Payment", ct);

    public Task HandleAsync(PaymentRefundedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.InvoiceRefunded, new
        {
            notification.RefundPayment.Id,
            notification.RefundPayment.InvoiceId,
            notification.RefundAmount,
            notification.RefundReason
        }, notification.RefundPayment.InvoiceId, "Payment", ct);

    #endregion

    #region Products

    public Task HandleAsync(ProductCreatedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.ProductCreated, new
        {
            notification.Product.Id,
            Name = notification.Product.RootName
        }, notification.Product.Id, "ProductRoot", ct);

    public Task HandleAsync(ProductSavedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.ProductUpdated, new
        {
            notification.Product.Id,
            Name = notification.Product.RootName
        }, notification.Product.Id, "ProductRoot", ct);

    public Task HandleAsync(ProductDeletedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.ProductDeleted, new
        {
            Id = notification.ProductId,
            Name = notification.ProductName
        }, notification.ProductId, "ProductRoot", ct);

    #endregion

    #region Customers

    public Task HandleAsync(CustomerCreatedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.CustomerCreated, new
        {
            notification.Customer.Id,
            notification.Customer.Email,
            notification.Customer.FirstName,
            notification.Customer.LastName,
            notification.Customer.DateCreated
        }, notification.Customer.Id, "Customer", ct);

    public Task HandleAsync(CustomerSavedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.CustomerUpdated, new
        {
            notification.Customer.Id,
            notification.Customer.Email,
            notification.Customer.FirstName,
            notification.Customer.LastName,
            notification.Customer.DateUpdated
        }, notification.Customer.Id, "Customer", ct);

    public Task HandleAsync(CustomerDeletedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.CustomerDeleted, new
        {
            notification.Customer.Id,
            notification.Customer.Email
        }, notification.Customer.Id, "Customer", ct);

    #endregion

    #region Shipments

    public Task HandleAsync(ShipmentCreatedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.ShipmentCreated, new
        {
            notification.Shipment.Id,
            notification.Shipment.OrderId,
            notification.Shipment.Carrier,
            notification.Shipment.TrackingNumber,
            notification.Shipment.DateCreated
        }, notification.Shipment.Id, "Shipment", ct);

    public Task HandleAsync(ShipmentSavedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.ShipmentUpdated, new
        {
            notification.Shipment.Id,
            notification.Shipment.OrderId,
            notification.Shipment.Carrier,
            notification.Shipment.TrackingNumber,
            notification.Shipment.DateCreated
        }, notification.Shipment.Id, "Shipment", ct);

    #endregion

    #region Discounts

    public Task HandleAsync(DiscountCreatedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.DiscountCreated, new
        {
            notification.Discount.Id,
            notification.Discount.Name,
            notification.Discount.Code,
            notification.Discount.Category,
            notification.Discount.Status
        }, notification.Discount.Id, "Discount", ct);

    public Task HandleAsync(DiscountSavedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.DiscountUpdated, new
        {
            notification.Discount.Id,
            notification.Discount.Name,
            notification.Discount.Code,
            notification.Discount.Category,
            notification.Discount.Status
        }, notification.Discount.Id, "Discount", ct);

    public Task HandleAsync(DiscountDeletedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.DiscountDeleted, new
        {
            notification.Discount.Id,
            notification.Discount.Name,
            notification.Discount.Code
        }, notification.Discount.Id, "Discount", ct);

    #endregion

    #region Inventory

    public Task HandleAsync(StockAdjustedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.InventoryAdjusted, new
        {
            notification.ProductId,
            notification.WarehouseId,
            notification.PreviousStock,
            notification.NewStock,
            notification.Reason
        }, notification.ProductId, "Product", ct);

    public Task HandleAsync(LowStockNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.InventoryLowStock, new
        {
            notification.ProductId,
            notification.WarehouseId,
            notification.CurrentStock,
            notification.Threshold
        }, notification.ProductId, "Product", ct);

    public Task HandleAsync(StockReservedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.InventoryReserved, new
        {
            notification.ProductId,
            notification.WarehouseId,
            notification.Quantity,
            notification.RemainingAvailable
        }, notification.ProductId, "Product", ct);

    public Task HandleAsync(StockAllocatedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.InventoryAllocated, new
        {
            notification.ProductId,
            notification.WarehouseId,
            notification.Quantity,
            notification.RemainingStock
        }, notification.ProductId, "Product", ct);

    #endregion

    #region Baskets

    public Task HandleAsync(BasketCreatedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.BasketCreated, new
        {
            notification.Basket.Id,
            notification.Basket.CustomerId,
            notification.Basket.Currency,
            notification.Basket.SubTotal,
            notification.Basket.Total,
            notification.Basket.DateCreated
        }, notification.Basket.Id, "Basket", ct);

    public Task HandleAsync(BasketItemAddedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.BasketUpdated, new
        {
            notification.Basket.Id,
            Event = "item.added",
            Item = new
            {
                notification.Item.Id,
                notification.Item.ProductId,
                notification.Item.Sku,
                notification.Item.Name,
                notification.Item.Quantity
            },
            notification.Basket.SubTotal,
            notification.Basket.Total,
            notification.Basket.DateUpdated
        }, notification.Basket.Id, "Basket", ct);

    public Task HandleAsync(BasketItemRemovedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.BasketUpdated, new
        {
            notification.Basket.Id,
            Event = "item.removed",
            Item = new
            {
                notification.Item.Id,
                notification.Item.ProductId,
                notification.Item.Sku,
                notification.Item.Name,
                notification.Item.Quantity
            },
            notification.Basket.SubTotal,
            notification.Basket.Total,
            notification.Basket.DateUpdated
        }, notification.Basket.Id, "Basket", ct);

    public Task HandleAsync(BasketItemQuantityChangedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.BasketUpdated, new
        {
            notification.Basket.Id,
            Event = "item.quantity_changed",
            Item = new
            {
                notification.Item.Id,
                notification.Item.ProductId,
                notification.Item.Sku,
                notification.Item.Name,
                notification.Item.Quantity
            },
            notification.OldQuantity,
            notification.NewQuantity,
            notification.Basket.SubTotal,
            notification.Basket.Total,
            notification.Basket.DateUpdated
        }, notification.Basket.Id, "Basket", ct);

    public Task HandleAsync(BasketClearedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.BasketUpdated, new
        {
            notification.Basket.Id,
            Event = "basket.cleared",
            notification.Basket.CustomerId,
            notification.Basket.Currency,
            notification.Basket.DateUpdated
        }, notification.Basket.Id, "Basket", ct);

    #endregion

    #region Checkout

    public Task HandleAsync(CheckoutAbandonedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.CheckoutAbandoned, new
        {
            notification.AbandonedCheckoutId,
            notification.BasketId,
            notification.CustomerEmail,
            notification.CustomerName,
            notification.BasketTotal,
            notification.CurrencyCode
        }, notification.AbandonedCheckoutId, "AbandonedCheckout", ct);

    public Task HandleAsync(CheckoutAbandonedFirstNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.CheckoutAbandonedFirst, new
        {
            notification.AbandonedCheckoutId,
            notification.BasketId,
            notification.CustomerEmail,
            notification.CustomerName,
            notification.BasketTotal,
            notification.RecoveryLink,
            notification.EmailSequenceNumber,
            notification.ItemCount
        }, notification.AbandonedCheckoutId, "AbandonedCheckout", ct);

    public Task HandleAsync(CheckoutAbandonedReminderNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.CheckoutAbandonedReminder, new
        {
            notification.AbandonedCheckoutId,
            notification.BasketId,
            notification.CustomerEmail,
            notification.CustomerName,
            notification.BasketTotal,
            notification.RecoveryLink,
            notification.EmailSequenceNumber,
            notification.ItemCount
        }, notification.AbandonedCheckoutId, "AbandonedCheckout", ct);

    public Task HandleAsync(CheckoutAbandonedFinalNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.CheckoutAbandonedFinal, new
        {
            notification.AbandonedCheckoutId,
            notification.BasketId,
            notification.CustomerEmail,
            notification.CustomerName,
            notification.BasketTotal,
            notification.RecoveryLink,
            notification.EmailSequenceNumber,
            notification.ItemCount
        }, notification.AbandonedCheckoutId, "AbandonedCheckout", ct);

    public Task HandleAsync(CheckoutRecoveredNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.CheckoutRecovered, new
        {
            notification.AbandonedCheckoutId,
            notification.BasketId,
            notification.CustomerEmail,
            notification.BasketTotal,
            notification.OriginalAbandonmentDate
        }, notification.AbandonedCheckoutId, "AbandonedCheckout", ct);

    public Task HandleAsync(CheckoutRecoveryConvertedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.CheckoutConverted, new
        {
            notification.AbandonedCheckoutId,
            notification.InvoiceId,
            notification.CustomerEmail,
            notification.OrderTotal,
            notification.OriginalAbandonmentDate,
            notification.RecoveredDate
        }, notification.AbandonedCheckoutId, "AbandonedCheckout", ct);

    #endregion

    #region Digital Products

    public Task HandleAsync(DigitalProductDeliveredNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.DigitalDelivered, new
        {
            InvoiceId = notification.Invoice.Id,
            InvoiceNumber = notification.Invoice.InvoiceNumber,
            CustomerEmail = notification.Invoice.BillingAddress.Email,
            DownloadLinkCount = notification.DownloadLinks.Count,
            DownloadLinks = notification.DownloadLinks.Select(l => new
            {
                l.Id,
                l.FileName,
                l.DownloadUrl,
                l.ExpiresUtc,
                l.MaxDownloads
            })
        }, notification.Invoice.Id, "Invoice", ct);

    #endregion

    #region Fulfilment

    public Task HandleAsync(FulfilmentSubmittedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.FulfilmentSubmitted, new
        {
            OrderId = notification.Order.Id,
            ProviderKey = notification.ProviderConfiguration.ProviderKey,
            ProviderReference = notification.ProviderReference,
            SubmittedAt = notification.Order.FulfilmentSubmittedAt
        }, notification.Order.Id, "Order", ct);

    public Task HandleAsync(FulfilmentSubmissionFailedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.FulfilmentFailed, new
        {
            OrderId = notification.Order.Id,
            ProviderKey = notification.ProviderConfiguration.ProviderKey,
            notification.ErrorMessage,
            notification.RetryCount
        }, notification.Order.Id, "Order", ct);

    public Task HandleAsync(FulfilmentInventoryUpdatedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.FulfilmentInventoryUpdated, new
        {
            ProviderKey = notification.ProviderConfiguration.ProviderKey,
            notification.SyncLog.ItemsProcessed,
            notification.SyncLog.ItemsSucceeded,
            notification.SyncLog.ItemsFailed,
            notification.SyncLog.CompletedAt
        }, notification.ProviderConfiguration.Id, "FulfilmentProviderConfiguration", ct);

    public Task HandleAsync(FulfilmentProductSyncedNotification notification, CancellationToken ct)
        => DispatchAsync(Constants.WebhookTopics.FulfilmentProductSynced, new
        {
            ProviderKey = notification.ProviderConfiguration.ProviderKey,
            notification.SyncLog.ItemsProcessed,
            notification.SyncLog.ItemsSucceeded,
            notification.SyncLog.ItemsFailed,
            notification.SyncLog.CompletedAt
        }, notification.ProviderConfiguration.Id, "FulfilmentProviderConfiguration", ct);

    #endregion

    private async Task DispatchAsync<T>(
        string topic,
        T payload,
        Guid entityId,
        string entityType,
        CancellationToken ct) where T : class
    {
        try
        {
            await webhookService.QueueDeliveryAsync(topic, payload, entityId, entityType, ct);
        }
        catch (Exception ex)
        {
            // Never let webhook failures break the main operation
            logger.LogError(ex, "Failed to dispatch webhook for {Topic}", topic);
        }
    }
}
