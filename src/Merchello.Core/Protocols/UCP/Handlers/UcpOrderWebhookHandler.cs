using System.Text.Json;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Notifications.Shipment;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.Notifications;
using Merchello.Core.Protocols.Webhooks;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Merchello.Core.Shared.Security;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Events;

namespace Merchello.Core.Protocols.UCP.Handlers;

/// <summary>
/// Handles order status changes and shipment events for UCP orders,
/// sending signed webhooks to the agent's webhook URL.
/// Runs at priority 3000 (after standard webhooks at 2000).
/// </summary>
[NotificationHandlerPriority(3000)]
public class UcpOrderWebhookHandler(
    IInvoiceService invoiceService,
    IPaymentService paymentService,
    IWebhookSigner webhookSigner,
    ISigningKeyStore signingKeyStore,
    IHttpClientFactory httpClientFactory,
    IMerchelloNotificationPublisher notificationPublisher,
    IOptions<ProtocolSettings> protocolSettings,
    ILogger<UcpOrderWebhookHandler> logger)
    : INotificationAsyncHandler<OrderStatusChangedNotification>,
      INotificationAsyncHandler<ShipmentCreatedNotification>,
      INotificationAsyncHandler<ShipmentSavedNotification>
{
    private readonly ProtocolSettings _protocolSettings = protocolSettings.Value;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        WriteIndented = false
    };

    public async Task HandleAsync(OrderStatusChangedNotification notification, CancellationToken ct)
    {
        if (!_protocolSettings.Ucp.Capabilities.Order)
        {
            return;
        }

        await SendOrderWebhookAsync(
            notification.Order,
            DetermineEventType(notification.OldStatus, notification.NewStatus),
            ct);
    }

    public async Task HandleAsync(ShipmentCreatedNotification notification, CancellationToken ct)
    {
        if (!_protocolSettings.Ucp.Capabilities.Order)
        {
            return;
        }

        // Get the order from the shipment using the order ID
        var order = await invoiceService.GetOrderWithDetailsAsync(notification.Shipment.OrderId, ct);
        if (order != null)
        {
            await SendOrderWebhookAsync(order, "order.shipped", ct);
        }
    }

    public async Task HandleAsync(ShipmentSavedNotification notification, CancellationToken ct)
    {
        if (!_protocolSettings.Ucp.Capabilities.Order)
        {
            return;
        }

        // Only send webhook if shipment status indicates delivery
        if (notification.Shipment.Status == ShipmentStatus.Delivered)
        {
            var order = await invoiceService.GetOrderWithDetailsAsync(notification.Shipment.OrderId, ct);
            if (order != null)
            {
                await SendOrderWebhookAsync(order, "order.delivered", ct);
            }
        }
    }

    private async Task SendOrderWebhookAsync(Order order, string eventType, CancellationToken ct)
    {
        try
        {
            // Load the invoice with source metadata
            var invoice = await invoiceService.GetInvoiceAsync(order.InvoiceId, ct);
            if (invoice == null)
            {
                logger.LogDebug("Invoice {InvoiceId} not found for order {OrderId}", order.InvoiceId, order.Id);
                return;
            }

            // Check if this is a UCP order
            if (invoice.Source?.Type != Constants.InvoiceSources.Ucp)
            {
                return;
            }

            // Get webhook URL from source metadata
            var webhookUrl = GetWebhookUrl(invoice.Source);
            if (string.IsNullOrEmpty(webhookUrl))
            {
                logger.LogDebug(
                    "No webhook URL configured for UCP invoice {InvoiceId}",
                    invoice.Id);
                return;
            }

            if (!UrlSecurityValidator.TryValidatePublicHttpUrl(
                    webhookUrl,
                    requireHttps: true,
                    out _,
                    out var urlError))
            {
                logger.LogWarning(
                    "Blocked UCP webhook for invoice {InvoiceId}. Disallowed URL {WebhookUrl}. Reason: {Reason}",
                    invoice.Id,
                    webhookUrl,
                    urlError);
                return;
            }

            logger.LogInformation(
                "Sending UCP order webhook for invoice {InvoiceId}, event: {EventType}",
                invoice.Id,
                eventType);

            // Build the UCP order payload
            var payload = BuildOrderPayload(invoice, eventType);
            var payloadJson = JsonSerializer.Serialize(payload, JsonOptions);

            // Send the webhook
            await SendWebhookAsync(webhookUrl, payloadJson, eventType, invoice.Id, ct);
        }
        catch (Exception ex)
        {
            // Never let webhook failures break the main operation
            logger.LogError(ex, "Failed to send UCP order webhook for order {OrderId}", order.Id);
        }
    }

    private static string? GetWebhookUrl(InvoiceSource? source)
    {
        if (source?.Metadata == null)
        {
            return null;
        }

        return source.Metadata.TryGetValue(Constants.UcpMetadataKeys.WebhookUrl, out var url)
            ? url?.ToString()
            : null;
    }

    private object BuildOrderPayload(Invoice invoice, string eventType)
    {
        // Determine overall fulfillment status from orders
        var fulfillmentStatus = DetermineFulfillmentStatus(invoice.Orders);
        var paymentStatus = DeterminePaymentStatus(invoice);

        // Map line items from all orders
        var lineItems = invoice.Orders?
            .SelectMany(o => o.LineItems ?? [])
            .Where(li => li.LineItemType == LineItemType.Product)
            .Select(li => new
            {
                id = li.Id.ToString(),
                product_id = li.ProductId?.ToString(),
                sku = li.Sku ?? string.Empty,
                name = li.Name ?? string.Empty,
                quantity = new
                {
                    total = li.Quantity,
                    fulfilled = GetFulfilledQuantity(li, invoice.Orders)
                },
                totals = new
                {
                    subtotal = ToMinorUnits(li.Amount * li.Quantity),
                    total = ToMinorUnits(li.Amount * li.Quantity)
                },
                status = GetLineItemStatus(li, invoice.Orders)
            })
            .ToList() ?? [];

        // Map fulfillment events from shipments
        var fulfillmentEvents = invoice.Orders?
            .SelectMany(o => o.Shipments ?? [])
            .Select(s => new
            {
                occurred_at = s.ShippedDate?.ToString("O") ?? s.DateCreated.ToString("O"),
                type = MapShipmentStatusToEventType(s.Status),
                line_items = s.LineItems?.Select(li => new
                {
                    id = li.Id.ToString(),
                    quantity = li.Quantity
                }).ToList(),
                tracking = !string.IsNullOrEmpty(s.TrackingNumber) ? new
                {
                    number = s.TrackingNumber,
                    url = s.TrackingUrl
                } : null
            })
            .ToList() ?? [];

        return new
        {
            ucp = new
            {
                version = _protocolSettings.Ucp.Version,
                capabilities = new[] { UcpCapabilityNames.Order }
            },
            @event = eventType,
            id = invoice.Id.ToString(),
            checkout_id = invoice.Source?.SessionId,
            permalink_url = $"/order/{invoice.Id}",
            line_items = lineItems,
            totals = new
            {
                subtotal = ToMinorUnits(invoice.SubTotal),
                tax = ToMinorUnits(invoice.Tax),
                total = ToMinorUnits(invoice.Total)
            },
            fulfillment = new
            {
                status = fulfillmentStatus,
                events = fulfillmentEvents
            },
            payment_status = paymentStatus
        };
    }

    private async Task SendWebhookAsync(
        string webhookUrl,
        string payload,
        string eventType,
        Guid invoiceId,
        CancellationToken ct)
    {
        var sendingNotification = new ProtocolWebhookSendingNotification(
            payload,
            webhookUrl,
            eventType,
            protocol: "ucp");

        if (await notificationPublisher.PublishCancelableAsync(sendingNotification, ct))
        {
            logger.LogInformation(
                "UCP webhook sending cancelled for invoice {InvoiceId} to {WebhookUrl}",
                invoiceId,
                webhookUrl);
            return;
        }

        var payloadToSend = sendingNotification.ModifiedPayload ?? sendingNotification.Entity;
        var success = false;
        int? statusCode = null;
        string? errorMessage = null;

        try
        {
            var keyId = await signingKeyStore.GetCurrentKeyIdAsync(ct);
            if (string.IsNullOrWhiteSpace(keyId))
            {
                logger.LogWarning(
                    "Unable to send UCP webhook for invoice {InvoiceId}. No signing key is configured.",
                    invoiceId);
                return;
            }

            var signature = await webhookSigner.SignAsync(payloadToSend, keyId, ct);

            var client = httpClientFactory.CreateClient("UcpWebhooks");
            client.Timeout = TimeSpan.FromSeconds(_protocolSettings.Ucp.WebhookTimeoutSeconds);

            using var request = new HttpRequestMessage(HttpMethod.Post, webhookUrl);
            request.Content = new StringContent(payloadToSend, System.Text.Encoding.UTF8, "application/json");

            // Add UCP webhook headers
            request.Headers.Add("Request-Signature", signature);
            request.Headers.Add("X-UCP-Event", eventType);
            request.Headers.Add("X-UCP-Delivery-Id", Guid.NewGuid().ToString());
            request.Headers.Add("User-Agent", "Merchello-UCP/1.0");

            using var response = await client.SendAsync(request, ct);
            statusCode = (int)response.StatusCode;
            success = response.IsSuccessStatusCode;

            if (success)
            {
                logger.LogInformation(
                    "UCP webhook delivered successfully for invoice {InvoiceId} to {WebhookUrl}",
                    invoiceId,
                    webhookUrl);
            }
            else
            {
                errorMessage = $"Non-success status code: {(int)response.StatusCode}";
                logger.LogWarning(
                    "UCP webhook delivery failed for invoice {InvoiceId}. Status: {StatusCode}",
                    invoiceId,
                    response.StatusCode);
            }
        }
        catch (TaskCanceledException)
        {
            errorMessage = "Webhook request timed out";
            logger.LogWarning("UCP webhook delivery timed out for invoice {InvoiceId}", invoiceId);
        }
        catch (HttpRequestException ex)
        {
            errorMessage = ex.Message;
            logger.LogWarning(ex, "HTTP error sending UCP webhook for invoice {InvoiceId}", invoiceId);
        }
        finally
        {
            await notificationPublisher.PublishAsync(
                new ProtocolWebhookSentNotification(
                    payloadToSend,
                    webhookUrl,
                    eventType,
                    protocol: "ucp",
                    success,
                    statusCode,
                    errorMessage),
                ct);
        }
    }

    private static string DetermineEventType(OrderStatus oldStatus, OrderStatus newStatus)
    {
        return newStatus switch
        {
            OrderStatus.Processing => "order.processing",
            OrderStatus.Shipped => "order.shipped",
            OrderStatus.Completed => "order.delivered",
            OrderStatus.Cancelled => "order.cancelled",
            _ => "order.updated"
        };
    }

    private static string DetermineFulfillmentStatus(ICollection<Order>? orders)
    {
        if (orders == null || orders.Count == 0)
        {
            return "unfulfilled";
        }

        var statuses = orders.Select(o => o.Status).ToList();

        if (statuses.All(s => s == OrderStatus.Completed))
        {
            return "fulfilled";
        }

        if (statuses.Any(s => s == OrderStatus.Shipped || s == OrderStatus.Completed))
        {
            return "partial";
        }

        if (statuses.Any(s => s == OrderStatus.Processing))
        {
            return "in_progress";
        }

        return "unfulfilled";
    }

    private string DeterminePaymentStatus(Invoice invoice)
    {
        var status = paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
        {
            Payments = invoice.Payments ?? [],
            InvoiceTotal = invoice.Total,
            CurrencyCode = invoice.CurrencyCode
        });

        return status.Status switch
        {
            InvoicePaymentStatus.Paid => "paid",
            InvoicePaymentStatus.PartiallyPaid => "partially_paid",
            InvoicePaymentStatus.PartiallyRefunded => "partially_refunded",
            InvoicePaymentStatus.Refunded => "refunded",
            InvoicePaymentStatus.AwaitingPayment => "awaiting_payment",
            _ => "unpaid"
        };
    }

    private static int GetFulfilledQuantity(LineItem lineItem, ICollection<Order>? orders)
    {
        if (orders == null)
        {
            return 0;
        }

        return orders
            .SelectMany(o => o.Shipments ?? [])
            .SelectMany(s => s.LineItems ?? [])
            .Where(li => li.Id == lineItem.Id)
            .Sum(li => li.Quantity);
    }

    private static string GetLineItemStatus(LineItem lineItem, ICollection<Order>? orders)
    {
        var fulfilled = GetFulfilledQuantity(lineItem, orders);
        if (fulfilled >= lineItem.Quantity)
        {
            return "fulfilled";
        }

        return fulfilled > 0 ? "partial" : "unfulfilled";
    }

    private static string MapShipmentStatusToEventType(ShipmentStatus status)
    {
        return status switch
        {
            ShipmentStatus.Preparing => ProtocolFulfillmentEventTypes.Processing,
            ShipmentStatus.Shipped => ProtocolFulfillmentEventTypes.Shipped,
            ShipmentStatus.Delivered => ProtocolFulfillmentEventTypes.Delivered,
            ShipmentStatus.Cancelled => ProtocolFulfillmentEventTypes.Canceled,
            _ => ProtocolFulfillmentEventTypes.Processing
        };
    }

    private static long ToMinorUnits(decimal amount) => (long)Math.Round(amount * 100);
}
