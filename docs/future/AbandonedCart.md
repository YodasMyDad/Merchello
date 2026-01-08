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
| `checkout.abandoned` | When checkout is detected as abandoned | ✅ Yes |
| `checkout.recovered` | When customer returns via recovery link | ✅ Yes |
| `checkout.converted` | When recovered checkout completes purchase | ✅ Yes |

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
            await service.ExpireOldRecoveriesAsync(expiryThreshold, stoppingToken);
        }
    }
}
```

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
    public int MaxRecoveryEmails { get; set; } = 3;
    public string RecoveryUrlBase { get; set; } = "/checkout/recover";
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
      "MaxRecoveryEmails": 3,
      "RecoveryUrlBase": "/checkout/recover"
    }
  }
}
```

---

## Notifications

### Location: `src/Merchello.Core/Notifications/CheckoutNotifications/`

> **Status**: ✅ **IMPLEMENTED** - These notifications have been created and are handled by the Email System's `EmailNotificationHandler`.

| Notification | Description | Use Case |
|--------------|-------------|----------|
| `CheckoutAbandonedNotification` | Fired when checkout is detected as abandoned | Trigger recovery email |
| `CheckoutRecoveredNotification` | Customer returned via recovery link | Analytics tracking |
| `CheckoutRecoveryConvertedNotification` | Recovered checkout completed purchase | Analytics tracking |

### Notification Properties

**CheckoutAbandonedNotification**:
- `AbandonedCheckoutId` (Guid) - ID of the abandoned checkout record
- `BasketId` (Guid) - ID of the abandoned basket
- `CustomerEmail` (string?) - Customer's email address
- `CustomerName` (string?) - Customer's name
- `BasketTotal` (decimal) - Total value of the abandoned basket
- `CurrencyCode` (string?) - Currency code (e.g., "USD", "GBP")
- `RecoveryLink` (string?) - Recovery link to restore the basket
- `FormattedTotal` (string) - Formatted total with currency symbol

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
2. Create a new email configuration:
   - **Topic**: `checkout.abandoned`
   - **Template**: Select or create an `AbandonedCart.cshtml` template
   - **To**: `{{customerEmail}}`
   - **Subject**: `Complete your purchase - {{formattedTotal}} waiting`
3. Enable the configuration

The `EmailNotificationHandler` (priority 2000) automatically queues emails when `CheckoutAbandonedNotification` is fired.

### Custom Handler (Advanced)

For complex requirements (A/B testing, tiered emails, third-party integration), implement a custom handler:

```csharp
[NotificationHandlerPriority(1500)] // Before email handler
public class CustomAbandonedCartHandler(
    ILogger<CustomAbandonedCartHandler> logger)
    : INotificationAsyncHandler<CheckoutAbandonedNotification>
{
    public async Task HandleAsync(CheckoutAbandonedNotification notification, CancellationToken ct)
    {
        // Custom logic here - e.g., send to external platform, apply A/B testing
        logger.LogInformation("Abandoned checkout detected: {Id}, Value: {Total}",
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

6. **Modify `CheckoutService`**:
   - Add `IAbandonedCheckoutService` to constructor
   - Add tracking call in `SaveAddressesAsync` (after email captured)
   - Add tracking call in `SaveShippingSelectionsAsync`
   - Add tracking call in `ApplyDiscountCodeAsync`

7. **Modify `InvoiceService`**:
   - Add `IAbandonedCheckoutService` to constructor
   - Add conversion tracking in `CreateOrderFromBasketAsync` (after invoice created)

8. **Add recovery endpoint** to `CheckoutApiController`

### Phase 3: Background Processing & Notifications

9. Create `AbandonedCheckoutDetectionJob` background service
10. ✅ **COMPLETED**: Notifications already exist in `src/Merchello.Core/Notifications/CheckoutNotifications/`:
    - `CheckoutAbandonedNotification`
    - `CheckoutRecoveredNotification`
    - `CheckoutRecoveryConvertedNotification`
11. ✅ **COMPLETED**: `EmailNotificationHandler` handles `checkout.abandoned`, `checkout.recovered`, `checkout.converted` topics
12. ✅ **COMPLETED**: `WebhookNotificationHandler` dispatches webhook deliveries for all checkout topics

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
