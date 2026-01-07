# Audit Trail System

Enterprise audit logging for compliance, forensics, and accountability.

## Overview

The audit trail system captures **who** did **what**, **when**, and **what changed** for all significant domain operations. Built on Merchello's notification infrastructure, it provides immutable, queryable records for compliance requirements (SOX, PCI-DSS, GDPR).

## Design Principles

- **Non-blocking** - Audit failures never break business operations
- **Immutable** - Records cannot be modified or deleted (append-only)
- **Queryable** - Efficient filtering by entity, user, date range, action
- **Extensible** - Custom metadata via ExtendedData pattern
- **Notification-driven** - Leverages existing event infrastructure (priority 2000)

## New Table Justification

This feature requires a new `merchAuditTrail` table. Per architecture guidelines ("only add new database tables if absolutely necessary"), this is justified by:

1. **Compliance Requirements** - SOX, PCI-DSS, and GDPR mandate immutable audit records separate from operational data
2. **Immutability** - Audit entries must never be modified; mixing with existing tables would compromise this
3. **Query Performance** - High-volume audit queries must not impact operational database performance
4. **Retention Policy** - Audit data has different lifecycle (7+ years) than operational data

## Architecture

```
Domain Operation → Service → Notification (Before/After)
                                    ↓
                           AuditTrailHandler (priority 2000)
                                    ↓
                           IAuditTrailService.LogAsync()
                                    ↓
                           AuditTrailEntry (persisted)
```

## 1. Entity Model

### AuditTrailEntry

```csharp
public class AuditTrailEntry
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    // What changed
    public string EntityType { get; set; } = string.Empty;    // "Invoice", "Order", "Product"
    public Guid EntityId { get; set; }
    public string? EntityReference { get; set; }               // Invoice number, SKU, etc.

    // What action
    public AuditAction Action { get; set; }
    public string? ActionDescription { get; set; }             // Human-readable summary

    // What values changed
    public string? FieldName { get; set; }                     // For single-field changes
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? ChangesJson { get; set; }                   // For multi-field changes

    // Who made the change
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    // When
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    // Context
    public Guid? CorrelationId { get; set; }                   // Links related operations
    public string? Source { get; set; }                        // "Backoffice", "API", "Webhook", "System"

    // Flexible metadata
    public Dictionary<string, object> ExtendedData { get; set; } = [];

    // Navigation (optional, for related entity queries)
    public Guid? ParentEntityId { get; set; }                  // e.g., InvoiceId for Order changes
    public string? ParentEntityType { get; set; }
}
```

### AuditAction Enum

```csharp
public enum AuditAction
{
    // Lifecycle
    Created = 10,
    Updated = 20,
    Deleted = 30,

    // Status changes
    StatusChanged = 100,
    Activated = 101,
    Deactivated = 102,
    Cancelled = 103,
    Completed = 104,

    // Financial
    PaymentReceived = 200,
    PaymentRefunded = 201,
    PriceChanged = 202,
    DiscountApplied = 203,
    DiscountRemoved = 204,

    // Inventory
    StockReserved = 300,
    StockAllocated = 301,
    StockReleased = 302,
    StockAdjusted = 303,

    // Fulfillment
    ShipmentCreated = 400,
    ShipmentUpdated = 401,
    Shipped = 402,
    Delivered = 403,

    // Access & Security
    Viewed = 500,
    Exported = 501,
    AccessGranted = 502,
    AccessRevoked = 503,

    // Custom
    Custom = 900
}
```

## 2. Factory

Per architecture guidelines ("All domain objects via factories"), audit entries are created through a factory:

### AuditTrailEntryFactory

```csharp
public class AuditTrailEntryFactory(IOptions<AuditTrailOptions> options)
{
    public AuditTrailEntry Create(LogAuditEntryParameters parameters)
    {
        return new AuditTrailEntry
        {
            Id = GuidExtensions.NewSequentialGuid(),
            EntityType = parameters.EntityType,
            EntityId = parameters.EntityId,
            EntityReference = parameters.EntityReference,
            Action = parameters.Action,
            ActionDescription = parameters.ActionDescription,
            FieldName = parameters.FieldName,
            OldValue = RedactIfSensitive(parameters.FieldName, parameters.OldValue),
            NewValue = RedactIfSensitive(parameters.FieldName, parameters.NewValue),
            ChangesJson = parameters.Changes != null
                ? JsonSerializer.Serialize(RedactSensitiveChanges(parameters.Changes))
                : null,
            UserId = parameters.UserId,
            UserName = parameters.UserName,
            UserEmail = parameters.UserEmail,
            IpAddress = options.Value.IncludeIpAddress ? parameters.IpAddress : null,
            UserAgent = options.Value.IncludeUserAgent ? parameters.UserAgent : null,
            DateCreated = DateTime.UtcNow,
            CorrelationId = parameters.CorrelationId,
            Source = parameters.Source,
            ParentEntityId = parameters.ParentEntityId,
            ParentEntityType = parameters.ParentEntityType,
            ExtendedData = parameters.ExtendedData ?? []
        };
    }

    private string? RedactIfSensitive(string? fieldName, string? value)
    {
        if (value == null || fieldName == null) return value;
        if (options.Value.SensitiveFields.Contains(fieldName, StringComparer.OrdinalIgnoreCase))
        {
            return "[REDACTED]";
        }
        return value;
    }

    private Dictionary<string, FieldChange> RedactSensitiveChanges(Dictionary<string, FieldChange> changes)
    {
        return changes.ToDictionary(
            kvp => kvp.Key,
            kvp => options.Value.SensitiveFields.Contains(kvp.Key, StringComparer.OrdinalIgnoreCase)
                ? new FieldChange { OldValue = "[REDACTED]", NewValue = "[REDACTED]" }
                : kvp.Value
        );
    }
}
```

## 3. Service Layer

### IAuditTrailService

```csharp
public interface IAuditTrailService
{
    // Write operations
    Task<CrudResult<AuditTrailEntry>> LogAsync(
        LogAuditEntryParameters parameters,
        CancellationToken cancellationToken = default);

    Task<CrudResult<IEnumerable<AuditTrailEntry>>> LogBatchAsync(
        IEnumerable<LogAuditEntryParameters> entries,
        CancellationToken cancellationToken = default);

    // Query operations
    Task<PaginatedList<AuditTrailEntry>> QueryAsync(
        AuditTrailQueryParameters parameters,
        CancellationToken cancellationToken = default);

    Task<IEnumerable<AuditTrailEntry>> GetEntityHistoryAsync(
        string entityType,
        Guid entityId,
        CancellationToken cancellationToken = default);

    Task<IEnumerable<AuditTrailEntry>> GetUserActivityAsync(
        Guid userId,
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellationToken = default);

    Task<IEnumerable<AuditTrailEntry>> GetByCorrelationIdAsync(
        Guid correlationId,
        CancellationToken cancellationToken = default);

    // Export (for compliance reports)
    Task<Stream> ExportAsync(
        AuditTrailExportParameters parameters,
        CancellationToken cancellationToken = default);
}
```

### Parameter Models

```csharp
public class LogAuditEntryParameters
{
    public required string EntityType { get; set; }
    public required Guid EntityId { get; set; }
    public string? EntityReference { get; set; }
    public required AuditAction Action { get; set; }
    public string? ActionDescription { get; set; }
    public string? FieldName { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public Dictionary<string, FieldChange>? Changes { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public Guid? CorrelationId { get; set; }
    public string? Source { get; set; }
    public Guid? ParentEntityId { get; set; }
    public string? ParentEntityType { get; set; }
    public Dictionary<string, object>? ExtendedData { get; set; }
}

public class FieldChange
{
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
}

public class AuditTrailQueryParameters
{
    public string? EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public Guid? UserId { get; set; }
    public AuditAction? Action { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Source { get; set; }
    public Guid? CorrelationId { get; set; }
    public string? SearchTerm { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string OrderBy { get; set; } = "DateCreated";
    public bool OrderDescending { get; set; } = true;
}

public class AuditTrailExportParameters
{
    public required string EntityType { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public ExportFormat Format { get; set; } = ExportFormat.Csv;
}

public enum ExportFormat { Csv, Json, Pdf }
```

## 4. Notification Handler

### AuditTrailHandler

Captures domain events and persists audit entries. Uses priority 2000 to ensure it runs after all business logic.

```csharp
[NotificationHandlerPriority(2000)]
internal class AuditTrailHandler(
    IAuditTrailService auditTrailService,
    IHttpContextAccessor httpContextAccessor,
    IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
    ILogger<AuditTrailHandler> logger)
    : INotificationAsyncHandler<OrderStatusChangedNotification>,
      INotificationAsyncHandler<InvoiceSavedNotification>,
      INotificationAsyncHandler<PaymentCreatedNotification>,
      INotificationAsyncHandler<PaymentRefundedNotification>,
      INotificationAsyncHandler<ShipmentCreatedNotification>,
      INotificationAsyncHandler<ProductSavedNotification>,
      INotificationAsyncHandler<CustomerSavedNotification>,
      INotificationAsyncHandler<StockAdjustedNotification>,
      INotificationAsyncHandler<DiscountSavedNotification>
{
    public async Task HandleAsync(OrderStatusChangedNotification notification, CancellationToken ct)
    {
        try
        {
            var (userId, userName, userEmail) = GetCurrentUser();

            await auditTrailService.LogAsync(new LogAuditEntryParameters
            {
                EntityType = "Order",
                EntityId = notification.Order.Id,
                EntityReference = notification.Order.OrderNumber,
                Action = AuditAction.StatusChanged,
                ActionDescription = $"Status changed from {notification.OldStatus} to {notification.NewStatus}",
                FieldName = "Status",
                OldValue = notification.OldStatus.ToString(),
                NewValue = notification.NewStatus.ToString(),
                UserId = userId,
                UserName = userName,
                UserEmail = userEmail,
                IpAddress = GetIpAddress(),
                UserAgent = GetUserAgent(),
                Source = DetermineSource(),
                ParentEntityId = notification.Order.InvoiceId,
                ParentEntityType = "Invoice",
                ExtendedData = new Dictionary<string, object>
                {
                    ["Reason"] = notification.Reason ?? ""
                }
            }, ct);
        }
        catch (Exception ex)
        {
            // Never break the main operation - log and continue
            logger.LogWarning(ex, "Failed to create audit entry for order status change: {OrderId}",
                notification.Order.Id);
        }
    }

    public async Task HandleAsync(PaymentCreatedNotification notification, CancellationToken ct)
    {
        try
        {
            var payment = notification.Payment;
            var (userId, userName, userEmail) = GetCurrentUser();

            await auditTrailService.LogAsync(new LogAuditEntryParameters
            {
                EntityType = "Payment",
                EntityId = payment.Id,
                Action = AuditAction.PaymentReceived,
                ActionDescription = $"Payment of {payment.Amount:C} received via {payment.PaymentMethodType}",
                UserId = userId,
                UserName = userName,
                UserEmail = userEmail,
                IpAddress = GetIpAddress(),
                Source = DetermineSource(),
                ParentEntityId = payment.InvoiceId,
                ParentEntityType = "Invoice",
                ExtendedData = new Dictionary<string, object>
                {
                    ["Amount"] = payment.Amount,
                    ["Currency"] = payment.CurrencyCode ?? "",
                    ["PaymentMethod"] = payment.PaymentMethodType ?? "",
                    ["TransactionId"] = payment.TransactionId ?? ""
                }
            }, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to create audit entry for payment: {PaymentId}",
                notification.Payment.Id);
        }
    }

    // Additional handlers for other notification types...

    private (Guid? UserId, string? UserName, string? UserEmail) GetCurrentUser()
    {
        var backOfficeUser = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
        if (backOfficeUser != null)
        {
            return (backOfficeUser.Key, backOfficeUser.Name, backOfficeUser.Email);
        }

        // Could also check for customer/API user context
        return (null, "System", null);
    }

    private string? GetIpAddress()
    {
        return httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
    }

    private string? GetUserAgent()
    {
        return httpContextAccessor.HttpContext?.Request.Headers.UserAgent.ToString();
    }

    private string DetermineSource()
    {
        var context = httpContextAccessor.HttpContext;
        if (context == null) return "System";

        var path = context.Request.Path.Value ?? "";

        if (path.Contains("/umbraco/backoffice")) return "Backoffice";
        if (path.Contains("/api/merchello/webhook")) return "Webhook";
        if (path.Contains("/api/")) return "API";

        return "Storefront";
    }
}
```

## 5. Change Detection

For detecting field-level changes on entity updates:

### IAuditChangeDetector

```csharp
public interface IAuditChangeDetector
{
    Dictionary<string, FieldChange> DetectChanges<T>(T original, T updated, params string[] includeFields);
    Dictionary<string, FieldChange> DetectChanges(object original, object updated, IEnumerable<string> fields);
}
```

### Implementation

```csharp
public class AuditChangeDetector : IAuditChangeDetector
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = false,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public Dictionary<string, FieldChange> DetectChanges<T>(T original, T updated, params string[] includeFields)
    {
        var changes = new Dictionary<string, FieldChange>();
        var properties = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance);

        var fieldsToCheck = includeFields.Length > 0
            ? properties.Where(p => includeFields.Contains(p.Name))
            : properties.Where(p => IsAuditableProperty(p));

        foreach (var prop in fieldsToCheck)
        {
            var oldVal = prop.GetValue(original);
            var newVal = prop.GetValue(updated);

            if (!Equals(oldVal, newVal))
            {
                changes[prop.Name] = new FieldChange
                {
                    OldValue = SerializeValue(oldVal),
                    NewValue = SerializeValue(newVal)
                };
            }
        }

        return changes;
    }

    private static bool IsAuditableProperty(PropertyInfo prop)
    {
        // Skip navigation properties, computed properties, etc.
        if (prop.GetCustomAttribute<NotAuditedAttribute>() != null) return false;
        if (!prop.CanRead || !prop.CanWrite) return false;
        if (typeof(IEnumerable).IsAssignableFrom(prop.PropertyType) && prop.PropertyType != typeof(string)) return false;

        return true;
    }

    private static string? SerializeValue(object? value)
    {
        if (value == null) return null;
        if (value is string s) return s;
        if (value is DateTime dt) return dt.ToString("O");
        if (value is decimal d) return d.ToString("F2");
        if (value.GetType().IsPrimitive || value.GetType().IsEnum) return value.ToString();

        return JsonSerializer.Serialize(value, JsonOptions);
    }
}

[AttributeUsage(AttributeTargets.Property)]
public class NotAuditedAttribute : Attribute { }
```

## 6. Database Configuration

### Entity Configuration

```csharp
public class AuditTrailEntryConfiguration : IEntityTypeConfiguration<AuditTrailEntry>
{
    public void Configure(EntityTypeBuilder<AuditTrailEntry> builder)
    {
        builder.ToTable("merchAuditTrail");

        builder.HasKey(x => x.Id);

        // Indexed for common queries
        builder.HasIndex(x => x.EntityType);
        builder.HasIndex(x => x.EntityId);
        builder.HasIndex(x => x.UserId);
        builder.HasIndex(x => x.DateCreated);
        builder.HasIndex(x => x.CorrelationId);
        builder.HasIndex(x => new { x.EntityType, x.EntityId, x.DateCreated });

        builder.Property(x => x.EntityType).HasMaxLength(100).IsRequired();
        builder.Property(x => x.EntityReference).HasMaxLength(100);
        builder.Property(x => x.ActionDescription).HasMaxLength(500);
        builder.Property(x => x.FieldName).HasMaxLength(100);
        builder.Property(x => x.OldValue).HasMaxLength(4000);
        builder.Property(x => x.NewValue).HasMaxLength(4000);
        builder.Property(x => x.ChangesJson).HasColumnType("nvarchar(max)");
        builder.Property(x => x.UserName).HasMaxLength(255);
        builder.Property(x => x.UserEmail).HasMaxLength(255);
        builder.Property(x => x.IpAddress).HasMaxLength(45);  // IPv6 max length
        builder.Property(x => x.UserAgent).HasMaxLength(500);
        builder.Property(x => x.Source).HasMaxLength(50);
        builder.Property(x => x.ParentEntityType).HasMaxLength(100);

        // ExtendedData as JSON
        builder.Property(x => x.ExtendedData)
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<Dictionary<string, object>>(v, (JsonSerializerOptions?)null) ?? [])
            .HasColumnType("nvarchar(max)");
    }
}
```

### Add to DbContext

```csharp
// In MerchelloDbContext.cs
public DbSet<AuditTrailEntry> AuditTrailEntries => Set<AuditTrailEntry>();
```

## 7. Registration

### Startup.cs

```csharp
// Factory
builder.Services.AddSingleton<AuditTrailEntryFactory>();

// Services
builder.Services.AddScoped<IAuditTrailService, AuditTrailService>();
builder.Services.AddSingleton<IAuditChangeDetector, AuditChangeDetector>();

// Notification handlers (priority 2000 - runs after business logic)
builder.AddNotificationAsyncHandler<OrderStatusChangedNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<OrderCreatedNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<InvoiceSavedNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<InvoiceCancelledNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<PaymentCreatedNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<PaymentRefundedNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<ShipmentCreatedNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<ShipmentSavedNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<ProductSavedNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<ProductDeletedNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<CustomerSavedNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<CustomerDeletedNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<StockAdjustedNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<StockReservedNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<StockAllocatedNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<DiscountSavedNotification, AuditTrailHandler>();
builder.AddNotificationAsyncHandler<DiscountDeletedNotification, AuditTrailHandler>();
```

## 8. Configuration

### appsettings.json

```json
{
  "Merchello": {
    "AuditTrail": {
      "Enabled": true,
      "RetentionDays": 2555,
      "IncludeUserAgent": true,
      "IncludeIpAddress": true,
      "SensitiveFields": ["Password", "CardNumber", "CVV", "SecurityCode"],
      "ExcludedActions": [],
      "ExcludedEntityTypes": []
    }
  }
}
```

### Configuration Class

```csharp
public class AuditTrailOptions
{
    public bool Enabled { get; set; } = true;
    public int RetentionDays { get; set; } = 2555;  // ~7 years for compliance
    public bool IncludeUserAgent { get; set; } = true;
    public bool IncludeIpAddress { get; set; } = true;
    public List<string> SensitiveFields { get; set; } = ["Password", "CardNumber", "CVV"];
    public List<AuditAction> ExcludedActions { get; set; } = [];
    public List<string> ExcludedEntityTypes { get; set; } = [];
}
```

## 9. DTOs

Per architecture guidelines, API responses use DTOs with `Dto` suffix in the `Dtos/` folder.

### AuditTrailEntryDto

```csharp
public class AuditTrailEntryDto
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string? EntityReference { get; set; }
    public string Action { get; set; } = string.Empty;
    public int ActionCode { get; set; }
    public string? ActionDescription { get; set; }
    public string? FieldName { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public Dictionary<string, FieldChangeDto>? Changes { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
    public string? IpAddress { get; set; }
    public string? Source { get; set; }
    public DateTime DateCreated { get; set; }
    public Guid? CorrelationId { get; set; }
    public Guid? ParentEntityId { get; set; }
    public string? ParentEntityType { get; set; }
}

public class FieldChangeDto
{
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
}
```

### AuditTrailEntryListItemDto

```csharp
public class AuditTrailEntryListItemDto
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string? EntityReference { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? ActionDescription { get; set; }
    public string? UserName { get; set; }
    public string? Source { get; set; }
    public DateTime DateCreated { get; set; }
}
```

### AuditTrailPageDto

```csharp
public class AuditTrailPageDto
{
    public List<AuditTrailEntryListItemDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
```

### Mapping Extension

```csharp
public static class AuditTrailMappingExtensions
{
    public static AuditTrailEntryDto ToDto(this AuditTrailEntry entry)
    {
        return new AuditTrailEntryDto
        {
            Id = entry.Id,
            EntityType = entry.EntityType,
            EntityId = entry.EntityId,
            EntityReference = entry.EntityReference,
            Action = entry.Action.ToString(),
            ActionCode = (int)entry.Action,
            ActionDescription = entry.ActionDescription,
            FieldName = entry.FieldName,
            OldValue = entry.OldValue,
            NewValue = entry.NewValue,
            Changes = entry.ChangesJson != null
                ? JsonSerializer.Deserialize<Dictionary<string, FieldChangeDto>>(entry.ChangesJson)
                : null,
            UserId = entry.UserId,
            UserName = entry.UserName,
            UserEmail = entry.UserEmail,
            IpAddress = entry.IpAddress,
            Source = entry.Source,
            DateCreated = entry.DateCreated,
            CorrelationId = entry.CorrelationId,
            ParentEntityId = entry.ParentEntityId,
            ParentEntityType = entry.ParentEntityType
        };
    }

    public static AuditTrailEntryListItemDto ToListItemDto(this AuditTrailEntry entry)
    {
        return new AuditTrailEntryListItemDto
        {
            Id = entry.Id,
            EntityType = entry.EntityType,
            EntityId = entry.EntityId,
            EntityReference = entry.EntityReference,
            Action = entry.Action.ToString(),
            ActionDescription = entry.ActionDescription,
            UserName = entry.UserName,
            Source = entry.Source,
            DateCreated = entry.DateCreated
        };
    }
}
```

## 10. API Endpoints

### AuditTrailApiController

```csharp
[ApiController]
[Route("api/merchello/audit")]
[Authorize(Policy = "MerchelloAdmin")]
public class AuditTrailApiController(
    IAuditTrailService auditTrailService) : Controller
{
    [HttpGet]
    public async Task<IActionResult> Query([FromQuery] AuditTrailQueryParameters parameters, CancellationToken ct)
    {
        var results = await auditTrailService.QueryAsync(parameters, ct);
        return Ok(results);
    }

    [HttpGet("entity/{entityType}/{entityId:guid}")]
    public async Task<IActionResult> GetEntityHistory(string entityType, Guid entityId, CancellationToken ct)
    {
        var results = await auditTrailService.GetEntityHistoryAsync(entityType, entityId, ct);
        return Ok(results);
    }

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetUserActivity(
        Guid userId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        var results = await auditTrailService.GetUserActivityAsync(userId, from, to, ct);
        return Ok(results);
    }

    [HttpGet("correlation/{correlationId:guid}")]
    public async Task<IActionResult> GetByCorrelation(Guid correlationId, CancellationToken ct)
    {
        var results = await auditTrailService.GetByCorrelationIdAsync(correlationId, ct);
        return Ok(results);
    }

    [HttpPost("export")]
    public async Task<IActionResult> Export([FromBody] AuditTrailExportParameters parameters, CancellationToken ct)
    {
        var stream = await auditTrailService.ExportAsync(parameters, ct);
        var contentType = parameters.Format switch
        {
            ExportFormat.Csv => "text/csv",
            ExportFormat.Json => "application/json",
            ExportFormat.Pdf => "application/pdf",
            _ => "application/octet-stream"
        };

        return File(stream, contentType, $"audit-trail-{DateTime.UtcNow:yyyy-MM-dd}.{parameters.Format.ToString().ToLower()}");
    }
}
```

## 11. Audited Events Summary

| Domain | Events Audited |
|--------|----------------|
| Order | Created, StatusChanged, Cancelled |
| Invoice | Created, Updated, Cancelled, Deleted |
| Payment | Created (received), Refunded |
| Shipment | Created, Updated, Shipped |
| Product | Created, Updated, Deleted, PriceChanged |
| Customer | Created, Updated, Deleted |
| Inventory | StockAdjusted, Reserved, Allocated, Released |
| Discount | Created, Updated, Deleted, Applied, Removed |

## 12. Sensitive Data Handling

Fields in `SensitiveFields` configuration are automatically redacted:

```csharp
private string? RedactIfSensitive(string fieldName, string? value)
{
    if (value == null) return null;
    if (_options.SensitiveFields.Contains(fieldName, StringComparer.OrdinalIgnoreCase))
    {
        return "[REDACTED]";
    }
    return value;
}
```

## 13. Retention & Cleanup

Background job for cleaning old audit entries:

```csharp
public class AuditTrailCleanupJob(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IOptions<AuditTrailOptions> options,
    ILogger<AuditTrailCleanupJob> logger) : IRecurringBackgroundJob
{
    public TimeSpan Period => TimeSpan.FromDays(1);

    public async Task RunJobAsync(CancellationToken ct)
    {
        if (options.Value.RetentionDays <= 0) return;

        var cutoff = DateTime.UtcNow.AddDays(-options.Value.RetentionDays);

        using var scope = efCoreScopeProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MerchelloDbContext>();

        var deleted = await db.AuditTrailEntries
            .Where(a => a.DateCreated < cutoff)
            .ExecuteDeleteAsync(ct);

        if (deleted > 0)
        {
            logger.LogInformation("Cleaned up {Count} audit trail entries older than {Date}", deleted, cutoff);
        }

        scope.Complete();
    }
}
```

## 14. Folder Structure

```
Merchello.Core/
├── Auditing/
│   ├── Models/
│   │   └── AuditTrailEntry.cs
│   ├── Dtos/
│   │   ├── AuditTrailEntryDto.cs
│   │   ├── AuditTrailEntryListItemDto.cs
│   │   ├── AuditTrailPageDto.cs
│   │   └── FieldChangeDto.cs
│   ├── Factories/
│   │   └── AuditTrailEntryFactory.cs
│   ├── Services/
│   │   ├── Interfaces/
│   │   │   ├── IAuditTrailService.cs
│   │   │   └── IAuditChangeDetector.cs
│   │   ├── Parameters/
│   │   │   ├── LogAuditEntryParameters.cs
│   │   │   ├── AuditTrailQueryParameters.cs
│   │   │   └── AuditTrailExportParameters.cs
│   │   ├── AuditTrailService.cs
│   │   └── AuditChangeDetector.cs
│   ├── Mapping/
│   │   ├── AuditTrailDbMapping.cs
│   │   └── AuditTrailMappingExtensions.cs
│   ├── Jobs/
│   │   └── AuditTrailCleanupJob.cs
│   └── AuditTrailOptions.cs
├── Notifications/
│   └── Handlers/
│       └── AuditTrailHandler.cs
```

## 15. Usage Examples

### Query audit trail for an invoice

```csharp
var history = await auditTrailService.GetEntityHistoryAsync("Invoice", invoiceId, ct);
```

### Get all actions by a user today

```csharp
var activity = await auditTrailService.GetUserActivityAsync(
    userId,
    DateTime.UtcNow.Date,
    DateTime.UtcNow,
    ct);
```

### Export compliance report

```csharp
var stream = await auditTrailService.ExportAsync(new AuditTrailExportParameters
{
    EntityType = "Payment",
    FromDate = new DateTime(2024, 1, 1),
    ToDate = new DateTime(2024, 12, 31),
    Format = ExportFormat.Csv
}, ct);
```

### Track related operations via correlation ID

```csharp
// When processing a checkout, set correlation ID
var correlationId = Guid.NewGuid();

// All audit entries during this operation share the correlation ID
// Later, retrieve all related entries:
var relatedEntries = await auditTrailService.GetByCorrelationIdAsync(correlationId, ct);
```

## 16. Implementation Priority

| Phase | Scope | Effort |
|-------|-------|--------|
| 1 | Core model, service, handler for Order/Invoice/Payment | Medium |
| 2 | Product, Customer, Inventory events | Medium |
| 3 | API endpoints, backoffice UI | Medium |
| 4 | Export functionality, cleanup job | Low |
| 5 | Advanced queries, correlation tracking | Low |

## 17. Compliance Mapping

| Requirement | How Addressed |
|-------------|---------------|
| PCI-DSS 10.2 | All payment events logged with user, timestamp, action |
| SOX | Immutable records, retention policy, export capability |
| GDPR Art. 30 | Processing activities logged, user actions tracked |
| GDPR Art. 17 | Sensitive data redacted, retention limits enforced |

## 18. Architecture Documentation Updates

When implementing this feature, update `docs/Architecture-Diagrams.md`:

### Services Table (Section 10)

Add to the Services table:

| Service | Responsibility |
|---------|----------------|
| `IAuditTrailService` | Audit logging, history queries, compliance exports |
| `IAuditChangeDetector` | Field-level change detection for entity updates |

### Factories Table (Section 3)

Add to the Factories table:

| Factory | Creates |
|---------|---------|
| `AuditTrailEntryFactory` | Audit trail entries with redaction |

### Background Jobs Table

Add to the Background Jobs table:

| Job | Responsibility |
|-----|----------------|
| `AuditTrailCleanupJob` | Removes audit entries older than retention period |
