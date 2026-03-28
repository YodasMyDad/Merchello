# Background Jobs

Merchello uses .NET's `IHostedService` / `BackgroundService` pattern to run background tasks. These jobs handle everything from retry queues and polling to cleanup and scheduled refreshes. All jobs use the `HostedServiceRuntimeGate` to wait for Umbraco to reach the `Run` level before starting, and each job runs in an isolated scope to avoid EF Core scope conflicts.

## Job Inventory

Here are all the background jobs in Merchello:

### Delivery and Communication

| Job | Location | Purpose |
|---|---|---|
| `OutboundDeliveryJob` | Webhooks | Processes pending webhook and email deliveries, handles retries, and cleans up old delivery logs |

### Fulfilment

| Job | Location | Purpose |
|---|---|---|
| `FulfilmentPollingJob` | Fulfilment | Polls 3PL providers for order status updates at a configurable interval (default: 15 min) |
| `FulfilmentRetryJob` | Fulfilment | Retries failed fulfilment submissions with exponential backoff |
| `FulfilmentCleanupJob` | Fulfilment | Cleans up old sync logs and webhook logs based on retention settings |

### Checkout and Recovery

| Job | Location | Purpose |
|---|---|---|
| `AbandonedCheckoutDetectionJob` | Checkout | Detects abandoned checkouts, schedules recovery emails, and expires old recovery tokens |

### Products and Catalog

| Job | Location | Purpose |
|---|---|---|
| `ProductFeedRefreshJob` | Product Feeds | Periodically rebuilds all enabled Google Shopping feeds (default: every 3 hours) |
| `ProductSyncWorkerJob` | Product Sync | Processes product sync operations from external sources |
| `ProductSyncCleanupJob` | Product Sync | Cleans up completed/expired sync records |

### Finance and Accounting

| Job | Location | Purpose |
|---|---|---|
| `InvoiceReminderJob` | Accounting | Sends payment reminders and overdue notifications for unpaid invoices |
| `ExchangeRateRefreshJob` | Exchange Rates | Refreshes currency exchange rates from configured providers |

### Status Management

| Job | Location | Purpose |
|---|---|---|
| `DiscountStatusJob` | Discounts | Transitions discount status based on start/end dates (activating scheduled, expiring ended) |
| `UpsellStatusJob` | Upsells | Transitions upsell rules from Active to Expired when their end date passes |

### Security and Protocol

| Job | Location | Purpose |
|---|---|---|
| `UcpSigningKeyRotationJob` | Protocols | Rotates ES256 signing keys for UCP webhook authentication |

### Cleanup

| Job | Location | Purpose |
|---|---|---|
| `EmailAttachmentCleanupJob` | Email | Removes orphaned email attachment files after the retention period (default: 72 hours) |

## Job Pattern

All Merchello background jobs follow the same pattern:

```csharp
public class MyJob(
    IServiceScopeFactory serviceScopeFactory,
    IRuntimeState runtimeState,
    ILogger<MyJob> logger) : BackgroundService
{
    protected override Task ExecuteAsync(CancellationToken stoppingToken)
        => HostedServiceRuntimeGate.RunIsolatedAsync(ExecuteCoreAsync, stoppingToken);

    private async Task ExecuteCoreAsync(CancellationToken stoppingToken)
    {
        // 1. Wait for Umbraco to be ready
        if (!await HostedServiceRuntimeGate.WaitForRunLevelAsync(
                runtimeState, logger, nameof(MyJob), stoppingToken))
        {
            return;
        }

        // 2. Main loop
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = serviceScopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<IMyService>();
                await service.DoWorkAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Error in MyJob");
            }

            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }
}
```

### Key Points

1. **`RunIsolatedAsync`** -- Wraps the job in an isolated execution context. This is critical because Umbraco's `EFCoreScope` uses `AsyncLocal` ambient state, and background tasks need their own scope chain.

2. **`WaitForRunLevelAsync`** -- Blocks until Umbraco has finished booting and is at the `Run` level. This prevents jobs from running during migrations or initialization.

3. **`IServiceScopeFactory`** -- Each iteration creates a new DI scope. This ensures fresh service instances and avoids scope lifetime issues.

4. **Error handling** -- Jobs catch all exceptions (except cancellation) to prevent a single failure from killing the background service.

> **Warning:** Never use `Task.WhenAll` to parallelize database calls inside background jobs. Umbraco's EFCoreScope uses AsyncLocal state, and concurrent database operations will corrupt scope ordering. See the [EFCoreScope documentation](../../) for details.

## Configuration

Most jobs have their intervals and behavior configured through settings objects in `appsettings.json`. Here are the key settings:

### Fulfilment Jobs

```json
{
  "Merchello": {
    "Fulfilment": {
      "PollingIntervalMinutes": 15,
      "MaxRetryAttempts": 5,
      "RetryDelaysMinutes": [5, 15, 30, 60, 120],
      "SyncLogRetentionDays": 30,
      "WebhookLogRetentionDays": 7
    }
  }
}
```

### Product Feed Refresh

```json
{
  "Merchello": {
    "ProductFeeds": {
      "AutoRefreshEnabled": true,
      "RefreshIntervalHours": 3
    }
  }
}
```

### Email Cleanup

```json
{
  "Merchello": {
    "Email": {
      "DeliveryRetentionDays": 30,
      "AttachmentRetentionHours": 72
    }
  }
}
```

## Monitoring

Background jobs log their activity through Microsoft.Extensions.Logging. Key log patterns to watch for:

- `{JobName} started with {Interval}` -- Job has started successfully
- `Error in {JobName}` -- Job iteration failed (will retry next cycle)
- Job-specific messages (e.g., "Polled {Count} orders from ShipBob")

Consider setting up log alerts for `Error` level messages from background jobs to catch recurring failures.

## Related Topics

- [Fulfilment System](../fulfilment/fulfilment-overview.md)
- [Email System](../email/email-overview.md)
- [Outbound Webhooks](../webhooks/webhooks-overview.md)
- [Product Feeds](../product-feeds/product-feeds-overview.md)
