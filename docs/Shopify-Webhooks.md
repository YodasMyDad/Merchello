# Outbound Webhooks System

## Overview

An outbound webhook system that pushes HTTP notifications to external systems when events occur in Merchello. Enables integrations with ERPs, fulfillment services, marketing platforms, and custom applications without polling.

## Gap Analysis

| Feature | Shopify | Merchello | Status |
|---------|---------|-----------|--------|
| Webhook subscriptions | Yes | No | **Missing** |
| Event topics | Yes (50+) | Internal only | **Extend** |
| Delivery retry | Yes | No | **Missing** |
| Webhook logs | Yes | No | **Missing** |
| Secret validation | Yes | No | **Missing** |
| API management | Yes | No | **Missing** |
| Test/ping endpoint | Yes | No | **Missing** |

---

## Architecture

### Integration with Existing Notification System

Merchello already has 40+ internal notifications (`INotificationAsyncHandler`). The webhook system bridges these to external HTTP endpoints:

```
Internal Event → Notification → WebhookDispatcher → HTTP POST → External System
                                      ↓
                              WebhookDeliveryLog
                                      ↓
                              Retry Queue (on failure)
```

---

## Entity Models

### Location: `src/Merchello.Core/Webhooks/Models/`

### WebhookSubscription.cs

```csharp
public class WebhookSubscription
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    // Subscription details
    public string Name { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;  // e.g., "order.created"
    public string TargetUrl { get; set; } = string.Empty;

    // Security
    public string Secret { get; set; } = string.Empty;  // For HMAC signing
    public WebhookAuthType AuthType { get; set; } = WebhookAuthType.HmacSha256;
    public string? AuthHeaderName { get; set; }  // Custom header name
    public string? AuthHeaderValue { get; set; }  // API key or bearer token

    // Configuration
    public bool IsActive { get; set; } = true;
    public WebhookFormat Format { get; set; } = WebhookFormat.Json;
    public string? ApiVersion { get; set; }  // Payload versioning
    public int TimeoutSeconds { get; set; } = 30;

    // Filtering (optional)
    public string? FilterExpression { get; set; }  // JSON path filter
    public Dictionary<string, string> Headers { get; set; } = [];

    // Statistics
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public DateTime? LastTriggeredUtc { get; set; }
    public DateTime? LastSuccessUtc { get; set; }
    public DateTime? LastFailureUtc { get; set; }
    public string? LastErrorMessage { get; set; }

    // Timestamps
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
```

### WebhookDelivery.cs

```csharp
public class WebhookDelivery
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid SubscriptionId { get; set; }
    public WebhookSubscription? Subscription { get; set; }

    // Event info
    public string Topic { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }  // Related entity (order, product, etc.)
    public string? EntityType { get; set; }

    // Request
    public string TargetUrl { get; set; } = string.Empty;
    public string RequestBody { get; set; } = string.Empty;
    public string RequestHeaders { get; set; } = string.Empty;  // JSON

    // Response
    public WebhookDeliveryStatus Status { get; set; } = WebhookDeliveryStatus.Pending;
    public int? ResponseStatusCode { get; set; }
    public string? ResponseBody { get; set; }
    public string? ResponseHeaders { get; set; }
    public string? ErrorMessage { get; set; }

    // Timing
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public DateTime? DateSent { get; set; }
    public DateTime? DateCompleted { get; set; }
    public int DurationMs { get; set; }

    // Retry
    public int AttemptNumber { get; set; } = 1;
    public DateTime? NextRetryUtc { get; set; }
}
```

### WebhookTopic.cs

```csharp
public class WebhookTopic
{
    public string Key { get; set; } = string.Empty;  // e.g., "order.created"
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;  // Orders, Products, Customers, etc.
    public Type? PayloadType { get; set; }  // DTO type for payload
    public string? SamplePayload { get; set; }  // JSON example
}
```

### Enums

```csharp
public enum WebhookAuthType
{
    None = 0,
    HmacSha256 = 1,      // X-Merchello-Hmac-SHA256 header
    HmacSha512 = 2,      // X-Merchello-Hmac-SHA512 header
    BearerToken = 3,     // Authorization: Bearer {token}
    ApiKey = 4,          // Custom header with API key
    BasicAuth = 5        // Authorization: Basic {base64}
}

public enum WebhookFormat
{
    Json = 1,
    FormUrlEncoded = 2
}

public enum WebhookDeliveryStatus
{
    Pending = 0,
    Sending = 1,
    Succeeded = 2,
    Failed = 3,
    Retrying = 4,
    Abandoned = 5  // Max retries exceeded
}
```

---

## Webhook Topics

### Supported Topics (mapped to existing notifications)

| Topic | Internal Notification | Description |
|-------|----------------------|-------------|
| **Orders** | | |
| `order.created` | `OrderCreatedNotification` | New order placed |
| `order.updated` | `OrderSavedNotification` | Order modified |
| `order.status_changed` | `OrderStatusChangedNotification` | Status transition |
| `order.cancelled` | `InvoiceCancelledNotification` | Order cancelled |
| **Invoices** | | |
| `invoice.created` | `InvoiceSavedNotification` | Invoice created |
| `invoice.paid` | `PaymentCreatedNotification` | Invoice fully paid |
| `invoice.refunded` | `PaymentRefundedNotification` | Refund processed |
| **Products** | | |
| `product.created` | `ProductCreatedNotification` | Product created |
| `product.updated` | `ProductSavedNotification` | Product modified |
| `product.deleted` | `ProductDeletedNotification` | Product deleted |
| **Inventory** | | |
| `inventory.adjusted` | `StockAdjustedNotification` | Stock level changed |
| `inventory.low_stock` | `LowStockNotification` | Below threshold |
| `inventory.reserved` | `StockReservedNotification` | Stock reserved |
| `inventory.allocated` | `StockAllocatedNotification` | Stock allocated |
| **Customers** | | |
| `customer.created` | `CustomerCreatedNotification` | New customer |
| `customer.updated` | `CustomerSavedNotification` | Customer modified |
| `customer.deleted` | `CustomerDeletedNotification` | Customer deleted |
| **Shipments** | | |
| `shipment.created` | `ShipmentCreatedNotification` | Shipment created |
| `shipment.updated` | `ShipmentSavedNotification` | Shipment modified |
| **Discounts** | | |
| `discount.created` | `DiscountCreatedNotification` | Discount created |
| `discount.updated` | `DiscountSavedNotification` | Discount modified |
| `discount.deleted` | `DiscountDeletedNotification` | Discount deleted |
| **Checkout** | | |
| `checkout.abandoned` | `CheckoutAbandonedNotification` | Cart abandoned |
| `checkout.recovered` | `CheckoutRecoveredNotification` | Cart recovered |
| **Baskets** | | |
| `basket.created` | `BasketCreatedNotification` | Basket created |
| `basket.updated` | `BasketSavedNotification` | Basket modified |

---

## DTOs

### Location: `src/Merchello.Core/Webhooks/Dtos/`

### Subscription DTOs

```csharp
public class WebhookSubscriptionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string TopicDisplayName { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public WebhookAuthType AuthType { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public DateTime? LastTriggeredUtc { get; set; }
    public DateTime? LastSuccessUtc { get; set; }
    public string? LastErrorMessage { get; set; }
    public DateTime DateCreated { get; set; }
}

public class WebhookSubscriptionDetailDto : WebhookSubscriptionDto
{
    public string? ApiVersion { get; set; }
    public int TimeoutSeconds { get; set; }
    public string? FilterExpression { get; set; }
    public Dictionary<string, string> Headers { get; set; } = [];
    public List<WebhookDeliveryDto> RecentDeliveries { get; set; } = [];
}

public class CreateWebhookSubscriptionDto
{
    [Required] public string Name { get; set; } = string.Empty;
    [Required] public string Topic { get; set; } = string.Empty;
    [Required, Url] public string TargetUrl { get; set; } = string.Empty;
    public WebhookAuthType AuthType { get; set; } = WebhookAuthType.HmacSha256;
    public string? AuthHeaderName { get; set; }
    public string? AuthHeaderValue { get; set; }
    public int TimeoutSeconds { get; set; } = 30;
    public string? FilterExpression { get; set; }
    public Dictionary<string, string>? Headers { get; set; }
}

public class UpdateWebhookSubscriptionDto
{
    public string? Name { get; set; }
    public string? TargetUrl { get; set; }
    public bool? IsActive { get; set; }
    public WebhookAuthType? AuthType { get; set; }
    public string? AuthHeaderName { get; set; }
    public string? AuthHeaderValue { get; set; }
    public int? TimeoutSeconds { get; set; }
    public string? FilterExpression { get; set; }
    public Dictionary<string, string>? Headers { get; set; }
}
```

### Delivery DTOs

```csharp
public class WebhookDeliveryDto
{
    public Guid Id { get; set; }
    public string Topic { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }
    public string? EntityType { get; set; }
    public WebhookDeliveryStatus Status { get; set; }
    public string StatusDisplay { get; set; } = string.Empty;
    public int? ResponseStatusCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime? DateCompleted { get; set; }
    public int DurationMs { get; set; }
    public int AttemptNumber { get; set; }
}

public class WebhookDeliveryDetailDto : WebhookDeliveryDto
{
    public string TargetUrl { get; set; } = string.Empty;
    public string RequestBody { get; set; } = string.Empty;
    public string RequestHeaders { get; set; } = string.Empty;
    public string? ResponseBody { get; set; }
    public string? ResponseHeaders { get; set; }
}
```

### Topic DTOs

```csharp
public class WebhookTopicDto
{
    public string Key { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? SamplePayload { get; set; }
}

public class WebhookTopicCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public List<WebhookTopicDto> Topics { get; set; } = [];
}
```

---

## Service Interface

### Location: `src/Merchello.Core/Webhooks/Services/Interfaces/IWebhookService.cs`

```csharp
public interface IWebhookService
{
    // Subscriptions
    Task<CrudResult<WebhookSubscription>> CreateSubscriptionAsync(
        CreateWebhookSubscriptionParameters parameters,
        CancellationToken ct = default);

    Task<CrudResult<WebhookSubscription>> UpdateSubscriptionAsync(
        UpdateWebhookSubscriptionParameters parameters,
        CancellationToken ct = default);

    Task<bool> DeleteSubscriptionAsync(Guid subscriptionId, CancellationToken ct = default);

    Task<WebhookSubscription?> GetSubscriptionAsync(Guid id, CancellationToken ct = default);

    Task<PaginatedList<WebhookSubscription>> QuerySubscriptionsAsync(
        WebhookSubscriptionQueryParameters parameters,
        CancellationToken ct = default);

    Task<IEnumerable<WebhookSubscription>> GetSubscriptionsForTopicAsync(
        string topic,
        CancellationToken ct = default);

    // Topics
    Task<IEnumerable<WebhookTopic>> GetAvailableTopicsAsync(CancellationToken ct = default);

    Task<IEnumerable<WebhookTopicCategoryDto>> GetTopicsByCategoryAsync(CancellationToken ct = default);

    // Delivery
    Task<Guid> QueueDeliveryAsync(
        string topic,
        object payload,
        Guid? entityId = null,
        string? entityType = null,
        CancellationToken ct = default);

    Task<WebhookDeliveryResult> DeliverAsync(
        Guid deliveryId,
        CancellationToken ct = default);

    Task<WebhookDelivery?> GetDeliveryAsync(Guid id, CancellationToken ct = default);

    Task<PaginatedList<WebhookDelivery>> QueryDeliveriesAsync(
        WebhookDeliveryQueryParameters parameters,
        CancellationToken ct = default);

    Task<IEnumerable<WebhookDelivery>> GetRecentDeliveriesAsync(
        Guid subscriptionId,
        int count = 10,
        CancellationToken ct = default);

    // Testing
    Task<WebhookDeliveryResult> SendTestAsync(
        Guid subscriptionId,
        CancellationToken ct = default);

    Task<WebhookDeliveryResult> PingAsync(
        string url,
        CancellationToken ct = default);

    // Retry
    Task RetryDeliveryAsync(Guid deliveryId, CancellationToken ct = default);

    Task ProcessPendingRetriesAsync(CancellationToken ct = default);

    // Statistics
    Task<WebhookStatsDto> GetStatsAsync(
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken ct = default);

    // Secret generation
    string GenerateSecret();
}
```

---

## Webhook Dispatcher

### Location: `src/Merchello.Core/Webhooks/Services/WebhookDispatcher.cs`

```csharp
public class WebhookDispatcher(
    IWebhookService webhookService,
    IHttpClientFactory httpClientFactory,
    ILogger<WebhookDispatcher> logger)
{
    /// <summary>
    /// Dispatches a webhook for the given topic and payload.
    /// Queues deliveries for all active subscriptions.
    /// </summary>
    public async Task DispatchAsync<T>(
        string topic,
        T payload,
        Guid? entityId = null,
        CancellationToken ct = default) where T : class
    {
        var subscriptions = await webhookService.GetSubscriptionsForTopicAsync(topic, ct);

        foreach (var subscription in subscriptions.Where(s => s.IsActive))
        {
            try
            {
                await webhookService.QueueDeliveryAsync(
                    topic,
                    payload,
                    entityId,
                    typeof(T).Name,
                    ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to queue webhook for {Topic} to {Url}",
                    topic, subscription.TargetUrl);
            }
        }
    }

    /// <summary>
    /// Sends a webhook delivery with signing and retry logic.
    /// </summary>
    public async Task<WebhookDeliveryResult> SendAsync(
        WebhookDelivery delivery,
        WebhookSubscription subscription,
        CancellationToken ct = default)
    {
        var client = httpClientFactory.CreateClient("Webhooks");
        client.Timeout = TimeSpan.FromSeconds(subscription.TimeoutSeconds);

        var request = new HttpRequestMessage(HttpMethod.Post, subscription.TargetUrl);
        request.Content = new StringContent(delivery.RequestBody, Encoding.UTF8, "application/json");

        // Add standard headers
        request.Headers.Add("X-Merchello-Topic", delivery.Topic);
        request.Headers.Add("X-Merchello-Delivery-Id", delivery.Id.ToString());
        request.Headers.Add("X-Merchello-Timestamp", DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString());

        // Add signature
        AddSignature(request, delivery.RequestBody, subscription);

        // Add custom headers
        foreach (var header in subscription.Headers)
        {
            request.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var response = await client.SendAsync(request, ct);
            stopwatch.Stop();

            return new WebhookDeliveryResult
            {
                Success = response.IsSuccessStatusCode,
                StatusCode = (int)response.StatusCode,
                ResponseBody = await response.Content.ReadAsStringAsync(ct),
                DurationMs = (int)stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return new WebhookDeliveryResult
            {
                Success = false,
                ErrorMessage = ex.Message,
                DurationMs = (int)stopwatch.ElapsedMilliseconds
            };
        }
    }

    private void AddSignature(HttpRequestMessage request, string body, WebhookSubscription subscription)
    {
        if (subscription.AuthType == WebhookAuthType.None)
            return;

        switch (subscription.AuthType)
        {
            case WebhookAuthType.HmacSha256:
                var hmac256 = ComputeHmacSha256(body, subscription.Secret);
                request.Headers.Add("X-Merchello-Hmac-SHA256", hmac256);
                break;

            case WebhookAuthType.HmacSha512:
                var hmac512 = ComputeHmacSha512(body, subscription.Secret);
                request.Headers.Add("X-Merchello-Hmac-SHA512", hmac512);
                break;

            case WebhookAuthType.BearerToken:
                request.Headers.Authorization =
                    new AuthenticationHeaderValue("Bearer", subscription.AuthHeaderValue);
                break;

            case WebhookAuthType.ApiKey:
                request.Headers.Add(
                    subscription.AuthHeaderName ?? "X-Api-Key",
                    subscription.AuthHeaderValue);
                break;

            case WebhookAuthType.BasicAuth:
                var basicAuth = Convert.ToBase64String(
                    Encoding.UTF8.GetBytes(subscription.AuthHeaderValue ?? ""));
                request.Headers.Authorization =
                    new AuthenticationHeaderValue("Basic", basicAuth);
                break;
        }
    }

    private static string ComputeHmacSha256(string data, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToBase64String(hash);
    }

    private static string ComputeHmacSha512(string data, string secret)
    {
        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToBase64String(hash);
    }
}
```

---

## Background Job

### Location: `src/Merchello.Core/Webhooks/Services/WebhookDeliveryJob.cs`

```csharp
public class WebhookDeliveryJob(
    IServiceScopeFactory serviceScopeFactory,
    IOptions<WebhookSettings> options,
    ILogger<WebhookDeliveryJob> logger) : BackgroundService
{
    private readonly WebhookSettings _settings = options.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(Math.Max(5, _settings.DeliveryIntervalSeconds));

        using var timer = new PeriodicTimer(interval);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = serviceScopeFactory.CreateScope();
                var webhookService = scope.ServiceProvider.GetRequiredService<IWebhookService>();

                // Process pending retries
                await webhookService.ProcessPendingRetriesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing webhook deliveries");
            }
        }
    }
}
```

---

## Configuration

### Location: `src/Merchello.Core/Webhooks/WebhookSettings.cs`

```csharp
public class WebhookSettings
{
    public bool Enabled { get; set; } = true;
    public int MaxRetries { get; set; } = 5;
    public int[] RetryDelaysSeconds { get; set; } = [60, 300, 900, 3600, 14400];  // 1m, 5m, 15m, 1h, 4h
    public int DeliveryIntervalSeconds { get; set; } = 10;
    public int DefaultTimeoutSeconds { get; set; } = 30;
    public int MaxPayloadSizeBytes { get; set; } = 1_000_000;  // 1MB
    public int DeliveryLogRetentionDays { get; set; } = 30;
}
```

### appsettings.json

```json
{
  "Merchello": {
    "Webhooks": {
      "Enabled": true,
      "MaxRetries": 5,
      "RetryDelaysSeconds": [60, 300, 900, 3600, 14400],
      "DeliveryIntervalSeconds": 10,
      "DefaultTimeoutSeconds": 30,
      "MaxPayloadSizeBytes": 1000000,
      "DeliveryLogRetentionDays": 30
    }
  }
}
```

---

## Notification Handler Integration

### Location: `src/Merchello.Core/Webhooks/Handlers/WebhookNotificationHandler.cs`

```csharp
/// <summary>
/// Generic handler that bridges internal notifications to webhook deliveries.
/// </summary>
public class WebhookNotificationHandler(
    IWebhookDispatcher dispatcher,
    ILogger<WebhookNotificationHandler> logger) :
    INotificationAsyncHandler<OrderCreatedNotification>,
    INotificationAsyncHandler<OrderSavedNotification>,
    INotificationAsyncHandler<OrderStatusChangedNotification>,
    INotificationAsyncHandler<ProductCreatedNotification>,
    INotificationAsyncHandler<ProductSavedNotification>,
    INotificationAsyncHandler<ProductDeletedNotification>,
    INotificationAsyncHandler<CustomerCreatedNotification>,
    INotificationAsyncHandler<PaymentCreatedNotification>,
    INotificationAsyncHandler<PaymentRefundedNotification>,
    INotificationAsyncHandler<ShipmentCreatedNotification>,
    INotificationAsyncHandler<StockAdjustedNotification>,
    INotificationAsyncHandler<LowStockNotification>
    // ... add more as needed
{
    public Task HandleAsync(OrderCreatedNotification notification, CancellationToken ct)
        => DispatchAsync("order.created", notification.Order, notification.Order.Id, ct);

    public Task HandleAsync(OrderStatusChangedNotification notification, CancellationToken ct)
        => DispatchAsync("order.status_changed", new
        {
            notification.Order,
            notification.PreviousStatus,
            notification.NewStatus
        }, notification.Order.Id, ct);

    public Task HandleAsync(ProductCreatedNotification notification, CancellationToken ct)
        => DispatchAsync("product.created", notification.Product, notification.Product.Id, ct);

    public Task HandleAsync(ProductSavedNotification notification, CancellationToken ct)
        => DispatchAsync("product.updated", notification.Product, notification.Product.Id, ct);

    public Task HandleAsync(ProductDeletedNotification notification, CancellationToken ct)
        => DispatchAsync("product.deleted", new { Id = notification.Product.Id }, notification.Product.Id, ct);

    public Task HandleAsync(CustomerCreatedNotification notification, CancellationToken ct)
        => DispatchAsync("customer.created", notification.Customer, notification.Customer.Id, ct);

    public Task HandleAsync(PaymentCreatedNotification notification, CancellationToken ct)
        => DispatchAsync("invoice.paid", notification.Payment, notification.Payment.InvoiceId, ct);

    public Task HandleAsync(PaymentRefundedNotification notification, CancellationToken ct)
        => DispatchAsync("invoice.refunded", notification.Payment, notification.Payment.InvoiceId, ct);

    public Task HandleAsync(ShipmentCreatedNotification notification, CancellationToken ct)
        => DispatchAsync("shipment.created", notification.Shipment, notification.Shipment.Id, ct);

    public Task HandleAsync(StockAdjustedNotification notification, CancellationToken ct)
        => DispatchAsync("inventory.adjusted", notification, notification.ProductId, ct);

    public Task HandleAsync(LowStockNotification notification, CancellationToken ct)
        => DispatchAsync("inventory.low_stock", notification, notification.ProductId, ct);

    // ... implement remaining handlers

    private async Task DispatchAsync<T>(string topic, T payload, Guid entityId, CancellationToken ct)
        where T : class
    {
        try
        {
            await dispatcher.DispatchAsync(topic, payload, entityId, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to dispatch webhook for {Topic}", topic);
        }
    }
}
```

---

## API Endpoints

### Location: `src/Merchello/Controllers/WebhooksApiController.cs`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/webhooks` | List subscriptions |
| GET | `/webhooks/{id}` | Get subscription details |
| POST | `/webhooks` | Create subscription |
| PUT | `/webhooks/{id}` | Update subscription |
| DELETE | `/webhooks/{id}` | Delete subscription |
| POST | `/webhooks/{id}/test` | Send test webhook |
| GET | `/webhooks/{id}/deliveries` | Get delivery history |
| GET | `/webhooks/topics` | Get available topics |
| GET | `/webhooks/topics/by-category` | Get topics by category |
| GET | `/webhooks/deliveries/{id}` | Get delivery details |
| POST | `/webhooks/deliveries/{id}/retry` | Retry failed delivery |
| GET | `/webhooks/stats` | Get delivery statistics |
| POST | `/webhooks/ping` | Test URL connectivity |

### Controller

```csharp
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class WebhooksApiController(
    IWebhookService webhookService,
    ILogger<WebhooksApiController> logger) : MerchelloApiControllerBase
{
    [HttpGet("webhooks")]
    public async Task<PaginatedList<WebhookSubscriptionDto>> GetSubscriptions(
        [FromQuery] WebhookSubscriptionQueryParameters parameters,
        CancellationToken ct)
    {
        var result = await webhookService.QuerySubscriptionsAsync(parameters, ct);
        return result.Map(MapToDto);
    }

    [HttpGet("webhooks/{id:guid}")]
    public async Task<IActionResult> GetSubscription(Guid id, CancellationToken ct)
    {
        var subscription = await webhookService.GetSubscriptionAsync(id, ct);
        if (subscription == null) return NotFound();

        var deliveries = await webhookService.GetRecentDeliveriesAsync(id, 10, ct);
        return Ok(MapToDetailDto(subscription, deliveries));
    }

    [HttpPost("webhooks")]
    public async Task<IActionResult> CreateSubscription(
        [FromBody] CreateWebhookSubscriptionDto dto,
        CancellationToken ct)
    {
        var result = await webhookService.CreateSubscriptionAsync(
            new CreateWebhookSubscriptionParameters
            {
                Name = dto.Name,
                Topic = dto.Topic,
                TargetUrl = dto.TargetUrl,
                AuthType = dto.AuthType,
                AuthHeaderName = dto.AuthHeaderName,
                AuthHeaderValue = dto.AuthHeaderValue,
                TimeoutSeconds = dto.TimeoutSeconds,
                FilterExpression = dto.FilterExpression,
                Headers = dto.Headers ?? []
            }, ct);

        if (!result.Successful)
            return BadRequest(result.Messages.FirstOrDefault()?.Message);

        return CreatedAtAction(nameof(GetSubscription),
            new { id = result.ResultObject!.Id },
            MapToDto(result.ResultObject));
    }

    [HttpPost("webhooks/{id:guid}/test")]
    public async Task<IActionResult> SendTest(Guid id, CancellationToken ct)
    {
        var result = await webhookService.SendTestAsync(id, ct);
        return Ok(result);
    }

    [HttpGet("webhooks/topics")]
    public async Task<IEnumerable<WebhookTopicDto>> GetTopics(CancellationToken ct)
    {
        var topics = await webhookService.GetAvailableTopicsAsync(ct);
        return topics.Select(MapToDto);
    }

    [HttpGet("webhooks/topics/by-category")]
    public async Task<IEnumerable<WebhookTopicCategoryDto>> GetTopicsByCategory(CancellationToken ct)
    {
        return await webhookService.GetTopicsByCategoryAsync(ct);
    }

    [HttpPost("webhooks/deliveries/{id:guid}/retry")]
    public async Task<IActionResult> RetryDelivery(Guid id, CancellationToken ct)
    {
        await webhookService.RetryDeliveryAsync(id, ct);
        return Ok();
    }

    [HttpPost("webhooks/ping")]
    public async Task<IActionResult> Ping([FromBody] PingWebhookDto dto, CancellationToken ct)
    {
        var result = await webhookService.PingAsync(dto.Url, ct);
        return Ok(result);
    }
}
```

---

## Frontend Components

### Location: `src/Merchello/Client/src/webhooks/`

```
webhooks/
  components/
    webhooks-list.element.ts
    webhook-detail.element.ts
    webhook-deliveries.element.ts
    webhook-delivery-detail.element.ts
    webhook-topic-picker.element.ts
  modals/
    create-webhook-modal.element.ts
    edit-webhook-modal.element.ts
    webhook-test-modal.element.ts
  contexts/
    webhooks-workspace.context.ts
  types/
    webhooks.types.ts
  manifest.ts
```

---

## Payload Format

### Standard Envelope

```json
{
  "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "topic": "order.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "api_version": "2024-01",
  "data": {
    // Topic-specific payload
  }
}
```

### Example: order.created

```json
{
  "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "topic": "order.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "api_version": "2024-01",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "invoiceNumber": "INV-0001",
    "customerId": "c1d2e3f4-5678-90ab-cdef-123456789012",
    "customerEmail": "customer@example.com",
    "status": "Pending",
    "subTotal": 99.99,
    "tax": 8.00,
    "shipping": 5.00,
    "total": 112.99,
    "currencyCode": "USD",
    "lineItems": [
      {
        "id": "li-001",
        "sku": "PROD-001",
        "name": "Example Product",
        "quantity": 2,
        "unitPrice": 49.99,
        "total": 99.98
      }
    ],
    "shippingAddress": {
      "name": "John Doe",
      "addressOne": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US"
    },
    "dateCreated": "2024-01-15T10:30:00Z"
  }
}
```

---

## Signature Verification (for consumers)

### Node.js Example

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}

// Express middleware
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-merchello-hmac-sha256'];
  const isValid = verifyWebhook(req.body, signature, process.env.WEBHOOK_SECRET);

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);
  // Process event...

  res.status(200).send('OK');
});
```

### C# Example

```csharp
public static bool VerifySignature(string payload, string signature, string secret)
{
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
    var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
    var computedSignature = Convert.ToBase64String(computedHash);

    return CryptographicOperations.FixedTimeEquals(
        Encoding.UTF8.GetBytes(signature),
        Encoding.UTF8.GetBytes(computedSignature));
}
```

---

## Database Changes

Add to `MerchelloDbContext.cs`:

```csharp
public DbSet<WebhookSubscription> WebhookSubscriptions => Set<WebhookSubscription>();
public DbSet<WebhookDelivery> WebhookDeliveries => Set<WebhookDelivery>();
```

---

## Implementation Sequence

1. Create entity models and enums
2. Create EF mappings and migration
3. Create DTOs
4. Implement `IWebhookService`
5. Implement `WebhookDispatcher`
6. Create notification handler (`WebhookNotificationHandler`)
7. Create background job (`WebhookDeliveryJob`)
8. Create API controller
9. Register services in DI
10. Register notification handlers
11. Create frontend components
12. Add to backoffice navigation
