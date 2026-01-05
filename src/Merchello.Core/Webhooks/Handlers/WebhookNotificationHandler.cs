using Merchello.Core.Notifications;
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
/// Runs at priority 2000 (after all business logic) to ensure data is finalized before dispatch.
/// </summary>
[NotificationHandlerPriority(2000)]
public class WebhookNotificationHandler(
    IWebhookService webhookService,
    IOptions<WebhookSettings> options,
    ILogger<WebhookNotificationHandler> logger)
    : INotificationAsyncHandler<OrderCreatedNotification>,
      INotificationAsyncHandler<OrderSavedNotification>,
      INotificationAsyncHandler<OrderStatusChangedNotification>,
      INotificationAsyncHandler<InvoiceSavedNotification>,
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
      INotificationAsyncHandler<StockAllocatedNotification>
{
    private readonly WebhookSettings _settings = options.Value;

    #region Orders

    public Task HandleAsync(OrderCreatedNotification notification, CancellationToken ct)
        => DispatchAsync("order.created", new
        {
            notification.Order.Id,
            notification.Order.InvoiceId,
            notification.Order.Status,
            notification.Order.DateCreated
        }, notification.Order.Id, "Order", ct);

    public Task HandleAsync(OrderSavedNotification notification, CancellationToken ct)
        => DispatchAsync("order.updated", new
        {
            notification.Order.Id,
            notification.Order.InvoiceId,
            notification.Order.Status,
            notification.Order.DateUpdated
        }, notification.Order.Id, "Order", ct);

    public Task HandleAsync(OrderStatusChangedNotification notification, CancellationToken ct)
        => DispatchAsync("order.status_changed", new
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
        => DispatchAsync("invoice.created", new
        {
            notification.Invoice.Id,
            notification.Invoice.InvoiceNumber,
            notification.Invoice.Total,
            notification.Invoice.DateCreated
        }, notification.Invoice.Id, "Invoice", ct);

    public Task HandleAsync(InvoiceCancelledNotification notification, CancellationToken ct)
        => DispatchAsync("order.cancelled", new
        {
            notification.Invoice.Id,
            notification.Invoice.InvoiceNumber,
            notification.Reason
        }, notification.Invoice.Id, "Invoice", ct);

    #endregion

    #region Payments

    public Task HandleAsync(PaymentCreatedNotification notification, CancellationToken ct)
        => DispatchAsync("invoice.paid", new
        {
            notification.Payment.Id,
            notification.Payment.InvoiceId,
            notification.Payment.Amount,
            notification.Payment.PaymentSuccess,
            notification.Payment.PaymentProviderAlias
        }, notification.Payment.InvoiceId, "Payment", ct);

    public Task HandleAsync(PaymentRefundedNotification notification, CancellationToken ct)
        => DispatchAsync("invoice.refunded", new
        {
            notification.RefundPayment.Id,
            notification.RefundPayment.InvoiceId,
            notification.RefundAmount,
            notification.RefundReason
        }, notification.RefundPayment.InvoiceId, "Payment", ct);

    #endregion

    #region Products

    public Task HandleAsync(ProductCreatedNotification notification, CancellationToken ct)
        => DispatchAsync("product.created", new
        {
            notification.Product.Id,
            Name = notification.Product.RootName
        }, notification.Product.Id, "ProductRoot", ct);

    public Task HandleAsync(ProductSavedNotification notification, CancellationToken ct)
        => DispatchAsync("product.updated", new
        {
            notification.Product.Id,
            Name = notification.Product.RootName
        }, notification.Product.Id, "ProductRoot", ct);

    public Task HandleAsync(ProductDeletedNotification notification, CancellationToken ct)
        => DispatchAsync("product.deleted", new
        {
            Id = notification.ProductId,
            Name = notification.ProductName
        }, notification.ProductId, "ProductRoot", ct);

    #endregion

    #region Customers

    public Task HandleAsync(CustomerCreatedNotification notification, CancellationToken ct)
        => DispatchAsync("customer.created", new
        {
            notification.Customer.Id,
            notification.Customer.Email,
            notification.Customer.FirstName,
            notification.Customer.LastName,
            notification.Customer.DateCreated
        }, notification.Customer.Id, "Customer", ct);

    public Task HandleAsync(CustomerSavedNotification notification, CancellationToken ct)
        => DispatchAsync("customer.updated", new
        {
            notification.Customer.Id,
            notification.Customer.Email,
            notification.Customer.FirstName,
            notification.Customer.LastName,
            notification.Customer.DateUpdated
        }, notification.Customer.Id, "Customer", ct);

    public Task HandleAsync(CustomerDeletedNotification notification, CancellationToken ct)
        => DispatchAsync("customer.deleted", new
        {
            notification.Customer.Id,
            notification.Customer.Email
        }, notification.Customer.Id, "Customer", ct);

    #endregion

    #region Shipments

    public Task HandleAsync(ShipmentCreatedNotification notification, CancellationToken ct)
        => DispatchAsync("shipment.created", new
        {
            notification.Shipment.Id,
            notification.Shipment.OrderId,
            notification.Shipment.Carrier,
            notification.Shipment.TrackingNumber,
            notification.Shipment.DateCreated
        }, notification.Shipment.Id, "Shipment", ct);

    public Task HandleAsync(ShipmentSavedNotification notification, CancellationToken ct)
        => DispatchAsync("shipment.updated", new
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
        => DispatchAsync("discount.created", new
        {
            notification.Discount.Id,
            notification.Discount.Name,
            notification.Discount.Code,
            notification.Discount.Category,
            notification.Discount.Status
        }, notification.Discount.Id, "Discount", ct);

    public Task HandleAsync(DiscountSavedNotification notification, CancellationToken ct)
        => DispatchAsync("discount.updated", new
        {
            notification.Discount.Id,
            notification.Discount.Name,
            notification.Discount.Code,
            notification.Discount.Category,
            notification.Discount.Status
        }, notification.Discount.Id, "Discount", ct);

    public Task HandleAsync(DiscountDeletedNotification notification, CancellationToken ct)
        => DispatchAsync("discount.deleted", new
        {
            notification.Discount.Id,
            notification.Discount.Name,
            notification.Discount.Code
        }, notification.Discount.Id, "Discount", ct);

    #endregion

    #region Inventory

    public Task HandleAsync(StockAdjustedNotification notification, CancellationToken ct)
        => DispatchAsync("inventory.adjusted", new
        {
            notification.ProductId,
            notification.WarehouseId,
            notification.PreviousStock,
            notification.NewStock,
            notification.Reason
        }, notification.ProductId, "Product", ct);

    public Task HandleAsync(LowStockNotification notification, CancellationToken ct)
        => DispatchAsync("inventory.low_stock", new
        {
            notification.ProductId,
            notification.WarehouseId,
            notification.CurrentStock,
            notification.Threshold
        }, notification.ProductId, "Product", ct);

    public Task HandleAsync(StockReservedNotification notification, CancellationToken ct)
        => DispatchAsync("inventory.reserved", new
        {
            notification.ProductId,
            notification.WarehouseId,
            notification.Quantity,
            notification.RemainingAvailable
        }, notification.ProductId, "Product", ct);

    public Task HandleAsync(StockAllocatedNotification notification, CancellationToken ct)
        => DispatchAsync("inventory.allocated", new
        {
            notification.ProductId,
            notification.WarehouseId,
            notification.Quantity,
            notification.RemainingStock
        }, notification.ProductId, "Product", ct);

    #endregion

    private async Task DispatchAsync<T>(
        string topic,
        T payload,
        Guid entityId,
        string entityType,
        CancellationToken ct) where T : class
    {
        if (!_settings.Enabled)
        {
            logger.LogDebug("Webhooks disabled, skipping dispatch for {Topic}", topic);
            return;
        }

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
