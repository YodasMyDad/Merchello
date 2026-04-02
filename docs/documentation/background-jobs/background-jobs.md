# Background Jobs

Merchello runs several background jobs that handle tasks like sending emails, polling fulfillment providers, refreshing exchange rates, and cleaning up old data. These jobs start automatically when your site boots and run on configurable intervals.

---

## Job Inventory

### Outbound Delivery

**OutboundDeliveryJob** -- Processes pending webhook and email deliveries. Handles retries for failed deliveries and cleans up old delivery logs based on retention settings.

Configured via `Merchello:Webhooks` and `Merchello:Email`:

```json
{
  "Merchello": {
    "Webhooks": {
      "DeliveryIntervalSeconds": 10,
      "MaxRetries": 5,
      "RetryDelaysSeconds": [60, 300, 900, 3600, 14400],
      "DeliveryLogRetentionDays": 30
    },
    "Email": {
      "MaxRetries": 3,
      "RetryDelaysSeconds": [60, 300, 900],
      "DeliveryRetentionDays": 30
    }
  }
}
```

### Fulfillment

**FulfilmentPollingJob** -- Polls 3PL providers for order status updates at a configurable interval.

**FulfilmentRetryJob** -- Retries failed fulfillment submissions with exponential backoff.

**FulfilmentCleanupJob** -- Cleans up old sync logs and webhook logs based on retention settings.

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

### Abandoned Checkout Recovery

**AbandonedCheckoutDetectionJob** -- Detects abandoned checkouts, schedules recovery emails, and expires old recovery tokens.

```json
{
  "Merchello": {
    "AbandonedCheckout": {
      "CheckIntervalMinutes": 15,
      "AbandonmentThresholdHours": 1.0,
      "FirstEmailDelayHours": 1,
      "ReminderEmailDelayHours": 24,
      "FinalEmailDelayHours": 48,
      "MaxRecoveryEmails": 3,
      "RecoveryExpiryDays": 30
    }
  }
}
```

### Product Feeds

**ProductFeedRefreshJob** -- Periodically rebuilds all enabled Google Shopping feeds to keep product and promotion data current.

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

Set `AutoRefreshEnabled` to `false` to disable automatic feed rebuilds entirely.

### Product Sync

**ProductSyncWorkerJob** -- Processes product import/export operations from the sync queue.

**ProductSyncCleanupJob** -- Cleans up completed and expired sync records.

```json
{
  "Merchello": {
    "ProductSync": {
      "WorkerIntervalSeconds": 10,
      "RunRetentionDays": 90,
      "ArtifactRetentionDays": 30
    }
  }
}
```

### Invoice Reminders

**InvoiceReminderJob** -- Sends payment reminders before due dates and overdue notifications for unpaid invoices.

```json
{
  "Merchello": {
    "InvoiceReminders": {
      "CheckIntervalHours": 24,
      "ReminderDaysBeforeDue": 7,
      "OverdueReminderIntervalDays": 7,
      "MaxOverdueReminders": 3
    }
  }
}
```

### Exchange Rate Refresh

**ExchangeRateRefreshJob** -- Refreshes currency exchange rates from your configured provider at a regular interval.

```json
{
  "Merchello": {
    "ExchangeRates": {
      "RefreshIntervalMinutes": 60
    }
  }
}
```

### Status Management

**DiscountStatusJob** -- Checks every minute for discounts whose scheduled end date has passed and transitions them from Active to Expired. Also activates scheduled discounts whose start date has arrived. This job runs on a fixed 1-minute interval and is not configurable.

**UpsellStatusJob** -- Transitions upsell rules from Active to Expired when their end date passes. Also cleans up old analytics events based on the retention setting.

```json
{
  "Merchello": {
    "Upsells": {
      "EventRetentionDays": 90
    }
  }
}
```

### Email Attachment Cleanup

**EmailAttachmentCleanupJob** -- Removes orphaned email attachment files after the retention period.

```json
{
  "Merchello": {
    "Email": {
      "AttachmentRetentionHours": 72
    }
  }
}
```

### Signing Key Rotation

**UcpSigningKeyRotationJob** -- Rotates ES256 signing keys used for UCP (Umbraco Commerce Protocol) webhook authentication. This runs automatically and requires no configuration.

---

## Monitoring

Background jobs log their activity through the standard .NET logging pipeline. Key log messages to watch for:

- **Startup**: `{JobName} started with {Interval}` -- Confirms the job is running with its configured interval.
- **Errors**: `Error in {JobName}` -- A job iteration failed. The job will retry on the next cycle.
- **Activity**: Job-specific messages like `Polled {Count} orders from {Provider}` or `Cleaned up {Count} delivery records`.

All errors are logged at the `Error` level. Consider setting up log alerts for recurring errors from background jobs to catch issues early.

---

## Related Topics

- [Fulfillment System](../fulfilment/fulfilment-overview.md)
- [Email System](../email/email-overview.md)
- [Outbound Webhooks](../webhooks/webhooks-overview.md)
- [Product Feeds](../product-feeds/product-feeds-overview.md)
