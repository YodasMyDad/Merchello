# Abandoned Cart Recovery

## Overview

Track abandoned checkouts and enable recovery through unique links and email notifications. Industry data shows 60-80% of carts are abandoned - recovery can reclaim 5-15% of lost revenue.

## Gap Analysis

| Feature | Shopify | Merchello | Status |
|---------|---------|-----------|--------|
| Cart persistence | Yes | Partial (baskets exist) | **Extend** |
| Abandonment detection | Yes | No | **Missing** |
| Recovery emails | Yes | No | **Missing** |
| Recovery links | Yes | No | **Missing** |
| Recovery analytics | Yes | No | **Missing** |
| Configurable thresholds | Yes | No | **Missing** |

---

## Integration Architecture

Abandoned cart tracking is **built into the standalone checkout** - no separate API calls required. The system automatically tracks activity through existing `CheckoutService` methods.

### Automatic Tracking Flow

```
Customer adds to basket
         ↓
Customer enters email (SaveAddressesAsync)  →  AbandonedCheckout record created
         ↓
Customer selects shipping (SaveShippingSelectionsAsync)  →  LastActivityUtc updated
         ↓
Customer leaves without completing...
         ↓
Background job detects abandonment (1 hour default)
         ↓
CheckoutAbandonedNotification fired  →  You send recovery email
         ↓
Customer clicks recovery link  →  Basket restored, redirected to checkout
         ↓
Customer completes purchase (CreateOrderFromBasketAsync)  →  Auto-marked as Converted
```

### CheckoutService Integration Points

| Existing Method | Abandoned Cart Behavior |
|-----------------|------------------------|
| `SaveAddressesAsync` | Creates `AbandonedCheckout` record when email is captured |
| `SaveShippingSelectionsAsync` | Updates `LastActivityUtc` |
| `ApplyDiscountCodeAsync` | Updates `LastActivityUtc` |
| `UpdateLineItemQuantity` | Updates `LastActivityUtc` (if checkout started) |

### InvoiceService Integration

| Method | Abandoned Cart Behavior |
|--------|------------------------|
| `CreateOrderFromBasketAsync` | Auto-marks abandoned checkout as `Converted` |

### What You Provide

1. **Email sending** - Choose one of the following approaches:
   - **Option A (Recommended)**: Use the **Email Builder UI** in the Merchello backoffice to configure automated recovery emails. Create an email configuration for the `checkout.abandoned` topic with a Razor template - the system handles delivery automatically via the unified `OutboundDelivery` infrastructure.
   - **Option B**: Implement `INotificationAsyncHandler<CheckoutAbandonedNotification>` for custom email logic (e.g., complex personalization, A/B testing, third-party service integration).
   - **Option C**: Subscribe to `checkout.abandoned` webhook to trigger external platforms (Klaviyo, Mailchimp, etc.)
2. **Configuration** - Set thresholds in `appsettings.json`

### What The System Handles Automatically

- Activity tracking on every checkout action
- Abandonment detection (background job)
- Recovery token generation
- Basket restoration from recovery link
- Conversion tracking when order completes
- Analytics and reporting
- **Email delivery** via Email Builder configurations (if configured)
- **Webhook delivery** (topics already registered)
- **Unified delivery logging** in `merchelloOutboundDeliveries` table

### Webhook & Email Integration

Abandoned cart events integrate with both the webhook and email systems. Topics are registered in `WebhookTopicRegistry` and `EmailTopicRegistry`:

| Topic | Trigger | Email Support |
|-------|---------|---------------|
| `checkout.abandoned.first` | First recovery email due (after abandonment detected) | ✅ Yes |
| `checkout.abandoned.reminder` | Reminder email due (24h after first email) | ✅ Yes |
| `checkout.abandoned.final` | Final email due (48h after reminder) | ✅ Yes |
| `checkout.recovered` | Customer returns via recovery link | ✅ Yes |
| `checkout.converted` | Recovered checkout completes purchase | ✅ Yes |

The background job controls timing - each notification only fires when that email is due AND the checkout is still in `Abandoned` status. If the customer converts after email 2, email 3 never fires.

External systems (Klaviyo, Mailchimp, custom CRM) can subscribe to webhooks OR configure emails via the Email Builder to trigger recovery flows.

---

## Entity Models

### Location: `src/Merchello.Core/Checkout/Models/`

### AbandonedCheckout.cs

```csharp
public class AbandonedCheckout
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid BasketId { get; set; }
    public Guid? CustomerId { get; set; }
    public string? Email { get; set; }

    public AbandonedCheckoutStatus Status { get; set; } = AbandonedCheckoutStatus.Active;

    // Timestamps
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public DateTime LastActivityUtc { get; set; } = DateTime.UtcNow;
    public DateTime? DateAbandoned { get; set; }
    public DateTime? DateRecovered { get; set; }
    public DateTime? DateConverted { get; set; }
    public DateTime? DateExpired { get; set; }

    // Recovery
    public Guid? RecoveredInvoiceId { get; set; }
    public string? RecoveryToken { get; set; }
    public DateTime? RecoveryTokenExpiresUtc { get; set; }
    public int RecoveryEmailsSent { get; set; }
    public DateTime? LastRecoveryEmailSentUtc { get; set; }

    // Basket snapshot
    public decimal BasketTotal { get; set; }
    public string? CurrencyCode { get; set; }
    public string? CurrencySymbol { get; set; }

    public Dictionary<string, object> ExtendedData { get; set; } = [];

    // Navigation
    public virtual Basket? Basket { get; set; }
}
```

> **Basket Lifecycle Note**: After order conversion via `CreateOrderFromBasketAsync`, the basket is deleted but the `AbandonedCheckout` record is retained for analytics. The `BasketId` becomes an orphaned reference, but `BasketTotal`, `CurrencyCode`, and `CurrencySymbol` preserve the key metrics needed for reporting.

### AbandonedCheckoutStatus.cs

```csharp
public enum AbandonedCheckoutStatus
{
    Active = 0,      // Checkout still potentially active
    Abandoned = 10,  // Detected as abandoned (past threshold)
    Recovered = 20,  // Customer returned via recovery link
    Converted = 30,  // Completed purchase after recovery
    Expired = 40     // Recovery window expired
}
```

---

## DTOs

### Location: `src/Merchello.Core/Checkout/Dtos/`

```csharp
public class AbandonedCheckoutListItemDto
{
    public Guid Id { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerName { get; set; }
    public decimal BasketTotal { get; set; }
    public string FormattedTotal { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public AbandonedCheckoutStatus Status { get; set; }
    public string StatusDisplay { get; set; } = string.Empty;
    public DateTime LastActivityUtc { get; set; }
    public DateTime? DateAbandoned { get; set; }
    public int RecoveryEmailsSent { get; set; }
}

public class AbandonedCheckoutStatsDto
{
    public int TotalAbandoned { get; set; }
    public int TotalRecovered { get; set; }
    public int TotalConverted { get; set; }
    public decimal RecoveryRate { get; set; }
    public decimal ConversionRate { get; set; }
    public decimal TotalValueAbandoned { get; set; }
    public decimal TotalValueRecovered { get; set; }
    public string FormattedValueAbandoned { get; set; } = string.Empty;
    public string FormattedValueRecovered { get; set; } = string.Empty;
}
```

---

## Service Interface

### Location: `src/Merchello.Core/Checkout/Services/Interfaces/IAbandonedCheckoutService.cs`

```csharp
public interface IAbandonedCheckoutService
{
    // Activity Tracking
    Task TrackCheckoutActivityAsync(Guid basketId, CancellationToken ct = default);
    Task TrackCheckoutActivityAsync(Basket basket, string? email = null, CancellationToken ct = default);

    // Query
    Task<AbandonedCheckoutPageDto> GetPagedAsync(
        AbandonedCheckoutQueryParameters parameters,
        CancellationToken ct = default);
    Task<AbandonedCheckout?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<AbandonedCheckout?> GetByBasketIdAsync(Guid basketId, CancellationToken ct = default);
    Task<AbandonedCheckout?> GetByRecoveryTokenAsync(string token, CancellationToken ct = default);

    // Status Management
    Task MarkAsRecoveredAsync(Guid id, CancellationToken ct = default);
    Task MarkAsConvertedAsync(Guid id, Guid invoiceId, CancellationToken ct = default);

    // Recovery
    Task<string> GenerateRecoveryLinkAsync(Guid id, CancellationToken ct = default);
    Task<CrudResult<Basket>> RestoreBasketFromRecoveryAsync(string token, CancellationToken ct = default);

    // Analytics
    Task<AbandonedCheckoutStatsDto> GetStatsAsync(
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken ct = default);

    // Background Job Support
    Task DetectAbandonedCheckoutsAsync(TimeSpan abandonmentThreshold, CancellationToken ct = default);
    Task SendScheduledRecoveryEmailsAsync(CancellationToken ct = default);
    Task ExpireOldRecoveriesAsync(TimeSpan expiryThreshold, CancellationToken ct = default);
}
```

### Query Parameters

```csharp
public class AbandonedCheckoutQueryParameters
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public AbandonedCheckoutStatus? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Search { get; set; }
    public decimal? MinValue { get; set; }
    public AbandonedCheckoutOrderBy OrderBy { get; set; } = AbandonedCheckoutOrderBy.DateAbandoned;
    public bool Descending { get; set; } = true;
}

public enum AbandonedCheckoutOrderBy
{
    DateAbandoned,
    LastActivity,
    Total,
    Email
}
```

---

## Background Job

### Location: `src/Merchello.Core/Checkout/Services/AbandonedCheckoutDetectionJob.cs`

The background job handles three responsibilities:
1. **Detect abandonment** - Mark checkouts as abandoned after inactivity threshold
2. **Send recovery emails** - Fire notifications for scheduled emails in the sequence
3. **Expire old recoveries** - Clean up expired recovery tokens

```csharp
public class AbandonedCheckoutDetectionJob(
    IServiceScopeFactory serviceScopeFactory,
    IOptions<AbandonedCheckoutSettings> options,
    ILogger<AbandonedCheckoutDetectionJob> logger) : BackgroundService
{
    private readonly AbandonedCheckoutSettings _settings = options.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var checkInterval = TimeSpan.FromMinutes(Math.Max(5, _settings.CheckIntervalMinutes));
        var abandonmentThreshold = TimeSpan.FromHours(Math.Max(0.5, _settings.AbandonmentThresholdHours));
        var expiryThreshold = TimeSpan.FromDays(Math.Max(1, _settings.RecoveryExpiryDays));

        using var timer = new PeriodicTimer(checkInterval);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            using var scope = serviceScopeFactory.CreateScope();
            var service = scope.ServiceProvider.GetRequiredService<IAbandonedCheckoutService>();

            await service.DetectAbandonedCheckoutsAsync(abandonmentThreshold, stoppingToken);
            await service.SendScheduledRecoveryEmailsAsync(stoppingToken);
            await service.ExpireOldRecoveriesAsync(expiryThreshold, stoppingToken);
        }
    }
}
```

### SendScheduledRecoveryEmailsAsync Implementation

This method checks all abandoned checkouts and fires the appropriate notification when each email in the sequence is due:

```csharp
public async Task SendScheduledRecoveryEmailsAsync(CancellationToken ct)
{
    var checkouts = await db.AbandonedCheckouts
        .Where(c => c.Status == AbandonedCheckoutStatus.Abandoned)
        .Where(c => c.RecoveryEmailsSent < 3)
        .ToListAsync(ct);

    foreach (var checkout in checkouts)
    {
        var (shouldSend, notification) = GetNextEmailIfDue(checkout);

        if (shouldSend && notification is not null)
        {
            await notificationService.PublishAsync(notification, ct);
            checkout.RecoveryEmailsSent++;
            checkout.LastRecoveryEmailSentUtc = DateTime.UtcNow;
        }
    }

    await db.SaveChangesAsync(ct);
}

private (bool ShouldSend, MerchelloNotification? Notification) GetNextEmailIfDue(AbandonedCheckout checkout)
{
    var now = DateTime.UtcNow;

    return checkout.RecoveryEmailsSent switch
    {
        // First email: X hours after DateAbandoned
        0 when checkout.DateAbandoned?.AddHours(_settings.FirstEmailDelayHours) <= now
            => (true, BuildNotification<CheckoutAbandonedFirstNotification>(checkout, 1)),

        // Reminder: X hours after first email was sent
        1 when checkout.LastRecoveryEmailSentUtc?.AddHours(_settings.ReminderEmailDelayHours) <= now
            => (true, BuildNotification<CheckoutAbandonedReminderNotification>(checkout, 2)),

        // Final: X hours after reminder was sent
        2 when checkout.LastRecoveryEmailSentUtc?.AddHours(_settings.FinalEmailDelayHours) <= now
            => (true, BuildNotification<CheckoutAbandonedFinalNotification>(checkout, 3)),

        _ => (false, null)
    };
}

private TNotification BuildNotification<TNotification>(AbandonedCheckout checkout, int sequenceNumber)
    where TNotification : CheckoutAbandonedNotificationBase, new()
{
    return new TNotification
    {
        AbandonedCheckoutId = checkout.Id,
        BasketId = checkout.BasketId,
        CustomerEmail = checkout.Email,
        BasketTotal = checkout.BasketTotal,
        CurrencyCode = checkout.CurrencyCode,
        FormattedTotal = $"{checkout.CurrencySymbol}{checkout.BasketTotal:N2}",
        RecoveryLink = GenerateRecoveryLink(checkout),
        EmailSequenceNumber = sequenceNumber
    };
}
```

**Key behavior**: The `Status == Abandoned` check ensures that if a customer converts (status changes to `Converted`), no further emails are sent.

---

## Configuration

### Location: `src/Merchello.Core/Checkout/AbandonedCheckoutSettings.cs`

```csharp
public class AbandonedCheckoutSettings
{
    public bool Enabled { get; set; } = true;
    public double AbandonmentThresholdHours { get; set; } = 1.0;
    public int RecoveryExpiryDays { get; set; } = 30;
    public int CheckIntervalMinutes { get; set; } = 15;
    public string RecoveryUrlBase { get; set; } = "/checkout/recover";

    // Recovery email sequence timing (hours after previous step)
    public int FirstEmailDelayHours { get; set; } = 1;      // After abandonment detected
    public int ReminderEmailDelayHours { get; set; } = 24;  // After first email sent
    public int FinalEmailDelayHours { get; set; } = 48;     // After reminder email sent
}
```

### appsettings.json

```json
{
  "Merchello": {
    "AbandonedCheckout": {
      "Enabled": true,
      "AbandonmentThresholdHours": 1.0,
      "RecoveryExpiryDays": 30,
      "CheckIntervalMinutes": 15,
      "RecoveryUrlBase": "/checkout/recover",
      "FirstEmailDelayHours": 1,
      "ReminderEmailDelayHours": 24,
      "FinalEmailDelayHours": 48
    }
  }
}
```

---

## Notifications

### Location: `src/Merchello.Core/Notifications/CheckoutNotifications/`

> **Implementation Note (Jan 2026 Audit)**: All notification publishers are implemented. The `AbandonedCheckoutDetectionJob` background job publishes the email sequence notifications, `CheckoutService` tracks activity, and `InvoiceService` handles conversion tracking. Email/webhook handlers are registered and will process notifications automatically.

The abandoned cart recovery uses a **three-email sequence** with separate notification types for each email. This allows different templates, subjects, and timing for each step.

| Notification | Topic | Description |
|--------------|-------|-------------|
| `CheckoutAbandonedFirstNotification` | `checkout.abandoned.first` | First recovery email (sent shortly after abandonment) |
| `CheckoutAbandonedReminderNotification` | `checkout.abandoned.reminder` | Follow-up reminder (default: 24h after first) |
| `CheckoutAbandonedFinalNotification` | `checkout.abandoned.final` | Last chance email (default: 48h after reminder) |
| `CheckoutRecoveredNotification` | `checkout.recovered` | Customer returned via recovery link |
| `CheckoutRecoveryConvertedNotification` | `checkout.converted` | Recovered checkout completed purchase |

### Recovery Email Sequence Flow

```
Checkout abandoned (1 hour of inactivity)
         ↓
Background job marks as Abandoned, sets DateAbandoned
         ↓
[FirstEmailDelayHours later - default 1h]
CheckoutAbandonedFirstNotification fired → First email sent
         ↓
[ReminderEmailDelayHours later - default 24h]
CheckoutAbandonedReminderNotification fired → Reminder email sent
         ↓
[FinalEmailDelayHours later - default 48h]
CheckoutAbandonedFinalNotification fired → Final email sent

⚠️ If customer converts at any point, subsequent emails do NOT fire
```

### Notification Properties

All three abandoned notifications share the same properties (inherit from `CheckoutAbandonedNotificationBase`):

**CheckoutAbandonedFirstNotification / ReminderNotification / FinalNotification**:
- `AbandonedCheckoutId` (Guid) - ID of the abandoned checkout record
- `BasketId` (Guid) - ID of the abandoned basket
- `CustomerEmail` (string?) - Customer's email address
- `CustomerName` (string?) - Customer's name
- `BasketTotal` (decimal) - Total value of the abandoned basket
- `CurrencyCode` (string?) - Currency code (e.g., "USD", "GBP")
- `RecoveryLink` (string?) - Recovery link to restore the basket
- `FormattedTotal` (string) - Formatted total with currency symbol
- `EmailSequenceNumber` (int) - Which email in sequence (1, 2, or 3)

**CheckoutRecoveredNotification**:
- `AbandonedCheckoutId` (Guid) - ID of the abandoned checkout record
- `BasketId` (Guid) - ID of the recovered basket
- `CustomerEmail` (string?) - Customer's email address
- `BasketTotal` (decimal) - Total value of the recovered basket
- `OriginalAbandonmentDate` (DateTime) - When the checkout was originally abandoned
- `RecoveredDate` (DateTime) - When the customer returned
- `TimeToRecovery` (TimeSpan) - Time between abandonment and recovery

**CheckoutRecoveryConvertedNotification**:
- `AbandonedCheckoutId` (Guid) - ID of the abandoned checkout record
- `InvoiceId` (Guid) - ID of the created invoice/order
- `CustomerEmail` (string?) - Customer's email address
- `OrderTotal` (decimal) - Final order total
- `OriginalAbandonmentDate` (DateTime) - When the checkout was originally abandoned
- `ConvertedDate` (DateTime) - When the order was placed
- `TimeToConversion` (TimeSpan) - Total time from abandonment to conversion

### Email Builder Configuration (Recommended)

The simplest way to send recovery emails is via the Email Builder UI in the Merchello backoffice:

1. Navigate to **Settings → Email** in the Merchello backoffice
2. Create three email configurations:

   **First Email** (`checkout.abandoned.first`):
   - **Template**: `AbandonedCart-First.cshtml`
   - **To**: `{{customerEmail}}`
   - **Subject**: `You left something behind!`

   **Reminder** (`checkout.abandoned.reminder`):
   - **Template**: `AbandonedCart-Reminder.cshtml`
   - **To**: `{{customerEmail}}`
   - **Subject**: `Still thinking it over? Your cart is waiting`

   **Final Notice** (`checkout.abandoned.final`):
   - **Template**: `AbandonedCart-Final.cshtml`
   - **To**: `{{customerEmail}}`
   - **Subject**: `Last chance - your cart expires soon`

3. Enable all three configurations

The `EmailNotificationHandler` (priority 2000) automatically queues emails when each notification fires. The background job controls timing and ensures emails only fire if the checkout is still in `Abandoned` status.

### Custom Handler (Advanced)

For complex requirements (A/B testing, third-party integration), implement a custom handler:

```csharp
[NotificationHandlerPriority(1500)] // Before email handler
public class CustomAbandonedCartHandler(
    ILogger<CustomAbandonedCartHandler> logger)
    : INotificationAsyncHandler<CheckoutAbandonedFirstNotification>
{
    public async Task HandleAsync(CheckoutAbandonedFirstNotification notification, CancellationToken ct)
    {
        // Custom logic here - e.g., send to external platform, apply A/B testing
        logger.LogInformation("Abandoned checkout first email: {Id}, Value: {Total}",
            notification.AbandonedCheckoutId, notification.FormattedTotal);
    }
}
```

---

## Implementation Details

### 1. CheckoutService Changes

Inject `IAbandonedCheckoutService` into `CheckoutService` and add tracking to existing methods:

```csharp
// CheckoutService.cs - Add to constructor
public class CheckoutService(
    // ... existing dependencies ...
    IAbandonedCheckoutService abandonedCheckoutService) : ICheckoutService
{
```

#### SaveAddressesAsync - Create/Update Abandoned Checkout

```csharp
public async Task<CrudResult<Basket>> SaveAddressesAsync(
    SaveAddressesParameters parameters,
    CancellationToken cancellationToken = default)
{
    // ... existing address saving logic ...

    // Track checkout activity (creates record on first email capture)
    if (!string.IsNullOrEmpty(parameters.Email))
    {
        await abandonedCheckoutService.TrackCheckoutActivityAsync(
            basket,
            parameters.Email,
            cancellationToken);
    }

    // ... rest of existing method ...
}
```

#### SaveShippingSelectionsAsync - Update Activity

```csharp
public async Task<CrudResult<Basket>> SaveShippingSelectionsAsync(
    SaveShippingSelectionsParameters parameters,
    CancellationToken cancellationToken = default)
{
    // ... existing shipping logic ...

    // Update last activity timestamp
    await abandonedCheckoutService.TrackCheckoutActivityAsync(
        parameters.Basket.Id,
        cancellationToken);

    // ... rest of existing method ...
}
```

### 2. InvoiceService Changes

Add conversion tracking to `CreateOrderFromBasketAsync`:

```csharp
public async Task<Invoice> CreateOrderFromBasketAsync(
    Basket basket,
    CheckoutSession checkoutSession,
    CancellationToken cancellationToken = default)
{
    // ... existing order creation logic ...

    // After invoice successfully created, mark any abandoned checkout as converted
    var abandoned = await _abandonedCheckoutService.GetByBasketIdAsync(basket.Id, cancellationToken);
    if (abandoned != null)
    {
        await _abandonedCheckoutService.MarkAsConvertedAsync(
            abandoned.Id,
            invoice.Id,
            cancellationToken);
    }

    // ... rest of existing method ...
}
```

### 3. Recovery Endpoint

Add to `CheckoutApiController`:

```csharp
/// <summary>
/// Restores a basket from a recovery link (abandoned cart recovery).
/// Replaces any existing basket the customer may have.
/// </summary>
[HttpGet("recover/{token}")]
[AllowAnonymous]
public async Task<IActionResult> RecoverCheckout(string token, CancellationToken ct)
{
    // Get existing basket ID from cookie (if any) to delete it
    var existingBasketId = Request.Cookies[Constants.Cookies.BasketId];
    if (Guid.TryParse(existingBasketId, out var basketIdToDelete))
    {
        await _checkoutService.DeleteBasket(basketIdToDelete, ct);
    }

    var result = await _abandonedCheckoutService.RestoreBasketFromRecoveryAsync(token, ct);

    if (!result.Successful)
        return BadRequest(result.Messages.FirstOrDefault()?.Message);

    // Set basket cookie so checkout can load the restored basket
    Response.Cookies.Append(
        Constants.Cookies.BasketId,
        result.ResultObject!.Id.ToString(),
        new CookieOptions
        {
            Expires = DateTimeOffset.UtcNow.AddDays(30),
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax
        });

    // Redirect to checkout page
    return Redirect(_settings.Value.AbandonedCheckout.RecoveryUrlBase.TrimEnd('/') + "/address");
}
```

> **Note**: Recovery replaces any existing basket the customer may have. The previous basket is deleted before the recovered basket is restored.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/abandoned-checkouts` | Query abandoned checkouts |
| GET | `/abandoned-checkouts/{id}` | Get details |
| GET | `/abandoned-checkouts/stats` | Get recovery statistics |
| POST | `/abandoned-checkouts/{id}/recovery-link` | Generate recovery link |
| GET | `/checkout/recover/{token}` | Restore basket (public) |

---

## Database Changes

Add to `MerchelloDbContext.cs`:

```csharp
public DbSet<AbandonedCheckout> AbandonedCheckouts => Set<AbandonedCheckout>();
```

### Mapping

```csharp
public class AbandonedCheckoutDbMapping : IEntityTypeConfiguration<AbandonedCheckout>
{
    public void Configure(EntityTypeBuilder<AbandonedCheckout> builder)
    {
        builder.ToTable("merchelloAbandonedCheckouts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Email).HasMaxLength(254);
        builder.Property(x => x.RecoveryToken).HasMaxLength(64);
        builder.Property(x => x.CurrencyCode).HasMaxLength(10);
        builder.Property(x => x.CurrencySymbol).HasMaxLength(3);
        builder.Property(x => x.BasketTotal).HasPrecision(18, 4);
        builder.Property(x => x.ExtendedData).ToJsonConversion(1000);

        builder.HasIndex(x => x.BasketId);
        builder.HasIndex(x => x.CustomerId);
        builder.HasIndex(x => x.Email);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.RecoveryToken)
            .IsUnique()
            .HasFilter("[RecoveryToken] IS NOT NULL");
    }
}
```

---

## Recovery Token Generation

```csharp
public string GenerateRecoveryToken()
{
    var bytes = RandomNumberGenerator.GetBytes(32);
    return Convert.ToBase64String(bytes)
        .Replace("+", "-")
        .Replace("/", "_")
        .TrimEnd('=');
}
```

---

## Implementation Sequence

### Phase 1: Core Infrastructure

1. Create `AbandonedCheckout` entity and `AbandonedCheckoutStatus` enum in `Checkout/Models/`
2. Create EF mapping in `Checkout/Mapping/AbandonedCheckoutDbMapping.cs`
3. Run migration script: `scripts/add-migration.ps1` with name `AddAbandonedCheckouts`
4. Create DTOs in `Checkout/Dtos/`
5. Create `IAbandonedCheckoutService` interface and implementation

### Phase 2: Integrate into Standalone Checkout

6. ✅ **COMPLETED**: **Modify `CheckoutService`**:
   - Add `IAbandonedCheckoutService` to constructor
   - Add tracking call in `SaveAddressesAsync` (after email captured)
   - Add tracking call in `SaveShippingSelectionsAsync`
   - Add tracking call in `ApplyDiscountCodeAsync`

7. ✅ **COMPLETED**: **Modify `InvoiceService`**:
   - Add `IAbandonedCheckoutService` to constructor
   - Add conversion tracking in `CreateOrderFromBasketAsync` (after invoice created)
   - **Publishes `CheckoutRecoveryConvertedNotification`**

8. ✅ **COMPLETED**: **Add recovery endpoint** to `CheckoutApiController`
   - GET `/checkout/recover/{token}` - Restore basket from recovery link
   - GET `/checkout/recover/{token}/validate` - Validate token without restoring

### Phase 3: Background Processing & Notifications

9. ✅ **COMPLETED**: Create `AbandonedCheckoutDetectionJob` background service (includes `SendScheduledRecoveryEmailsAsync`) - **this publishes the notifications**
10. ✅ **COMPLETED**: Create recovery email sequence notifications in `src/Merchello.Core/Notifications/CheckoutNotifications/`:
    - `CheckoutAbandonedNotificationBase` (shared base class)
    - `CheckoutAbandonedFirstNotification` (topic: `checkout.abandoned.first`)
    - `CheckoutAbandonedReminderNotification` (topic: `checkout.abandoned.reminder`)
    - `CheckoutAbandonedFinalNotification` (topic: `checkout.abandoned.final`)
    - `CheckoutRecoveredNotification` (class exists, publisher in step 8)
    - `CheckoutRecoveryConvertedNotification` (class exists, publisher in step 7)
11. ✅ **COMPLETED**: Update `EmailTopicRegistry` with all abandoned cart topics
12. ✅ **COMPLETED**: Update `WebhookTopicRegistry` with all abandoned cart topics
13. ✅ **COMPLETED**: `EmailNotificationHandler` handles all notification topics
14. ✅ **COMPLETED**: `WebhookNotificationHandler` dispatches webhook deliveries for all topics

> **Note (Jan 2026 Audit)**: All core abandoned cart functionality is now implemented. The background job publishes notifications, which are handled by email/webhook handlers automatically.

### Phase 4: Configuration & Registration

12. Create `AbandonedCheckoutSettings` configuration class
13. Register services and background job in DI (`MerchelloServiceCollectionExtensions`)
14. Add default configuration to `appsettings.json`

### Phase 5: Backoffice (Optional)

15. **Analytics Integration** - Add abandoned cart metrics to existing analytics workspace:
    - Recovery funnel graph (Abandoned → Recovered → Converted)
    - Abandoned cart value over time
    - Recovery rate trend line
    - Key stats cards: Total abandoned, Recovery rate %, Value recovered

16. **Abandoned Checkouts List** - Add workspace for viewing/managing abandoned checkouts:
    - List with columns: Customer, Total, Status, Last Activity, Emails Sent
    - Filter by status (Active, Abandoned, Recovered, Converted, Expired)
    - Actions: View basket contents, Resend recovery email, Copy recovery link
