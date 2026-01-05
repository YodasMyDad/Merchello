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
      "RecoveryUrlBase": "/checkout/recover"
    }
  }
}
```

---

## Notifications

### Location: `src/Merchello.Core/Notifications/Checkout/`

| Notification | Description | Use Case |
|--------------|-------------|----------|
| `CheckoutAbandonedNotification` | Fired when checkout is detected as abandoned | Trigger recovery email |
| `CheckoutRecoveredNotification` | Customer returned via recovery link | Analytics tracking |
| `CheckoutRecoveryConvertedNotification` | Recovered checkout completed purchase | Analytics tracking |

### Example Handler (Email Integration)

```csharp
public class AbandonedCheckoutEmailHandler(
    IEmailService emailService,
    IAbandonedCheckoutService abandonedService,
    ILogger<AbandonedCheckoutEmailHandler> logger)
    : INotificationAsyncHandler<CheckoutAbandonedNotification>
{
    public async Task HandleAsync(CheckoutAbandonedNotification notification, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(notification.CustomerEmail))
            return;

        var recoveryLink = await abandonedService.GenerateRecoveryLinkAsync(
            notification.AbandonedCheckout.Id, ct);

        await emailService.SendAbandonedCartEmailAsync(
            notification.CustomerEmail,
            notification.BasketTotal,
            recoveryLink,
            ct);
    }
}
```

---

## Integration Points

### 1. Track Activity on Checkout Actions

Hook into `CheckoutService`:

```csharp
// In CheckoutService methods
public async Task<CrudResult<CheckoutSession>> SaveAddressesAsync(...)
{
    // ... existing logic ...

    // Track activity
    await _abandonedCheckoutService.TrackCheckoutActivityAsync(
        basket,
        dto.Email,
        cancellationToken);

    return result;
}
```

### 2. Mark Converted on Order Creation

Hook into `InvoiceService.CreateOrderFromBasketAsync`:

```csharp
// After invoice created
var abandoned = await _abandonedCheckoutService.GetByBasketIdAsync(basket.Id, ct);
if (abandoned != null)
{
    await _abandonedCheckoutService.MarkAsConvertedAsync(abandoned.Id, invoice.Id, ct);
}
```

### 3. Recovery Endpoint

Add to `CheckoutApiController`:

```csharp
[HttpGet("recover/{token}")]
[AllowAnonymous]
public async Task<IActionResult> RecoverCheckout(string token, CancellationToken ct)
{
    var result = await _abandonedCheckoutService.RestoreBasketFromRecoveryAsync(token, ct);

    if (!result.Successful)
        return BadRequest(result.Messages.FirstOrDefault()?.Message);

    // Set basket cookie and redirect to checkout
    SetBasketCookie(result.ResultObject!.Id);
    return Redirect("/checkout");
}
```

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

1. Create entity model and enum
2. Create EF mapping and migration
3. Create DTOs
4. Create service interface and implementation
5. Create background job
6. Create notifications
7. Hook into CheckoutService for activity tracking
8. Hook into InvoiceService for conversion tracking
9. Add recovery endpoint
10. Register services and job in DI
11. Add configuration options
12. Create backoffice UI for viewing abandoned checkouts
