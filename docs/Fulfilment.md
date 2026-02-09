# Fulfilment Provider System - Architecture

## Overview

Pluggable Fulfilment Provider system to integrate with 3PLs (third-party logistics) for physical order fulfilment. **Separate from Shipping Providers** - shipping calculates rates, fulfilment handles physical work.

## Key Architectural Decisions

| Decision | Choice |
|----------|--------|
| **Relationship to Shipping** | Separate systems - Shipping for rates, Fulfilment for physical work |
| **Fulfilment level** | Per-Order (not Invoice) - each Order goes to one 3PL |
| **Linkage** | Per-warehouse with supplier-level defaults (hierarchical) |
| **Entity strategy** | Extend existing `Order` and `Shipment` - no parallel entities |
| **Status tracking** | Use existing `OrderStatus` + one new value (`FulfilmentFailed`) |
| **Provider data** | Add `ExtendedData` to Order/Shipment (currently missing) |
| **New tables** | Only 3: `FulfilmentProviderConfiguration` + `FulfilmentSyncLog` + `FulfilmentWebhookLog` |

## Separation of Concerns

| Concept | Purpose | Example |
|---------|---------|---------|
| **Shipping Provider** | Calculate rates at checkout | FedEx, UPS, Flat Rate |
| **Fulfilment Provider** | Physical picking, packing, shipping | ShipBob, Helm WMS, manual |
| **Carrier** | Delivery company | UPS, FedEx, Royal Mail |

---

## Why Order, Not Invoice?

```
Invoice → 1:N → Order → 1:N → Shipment
```

- One Invoice can have **multiple Orders** (each to different warehouses/3PLs)
- Each Order goes to **one** 3PL
- 3PLs work at the order level, not invoice level

**Example:**
```
Invoice #1001
├── Order A → Warehouse UK (ShipBob)  → FulfilmentProviderReference: "SB-123"
├── Order B → Warehouse US (Manual)   → FulfilmentProviderReference: null
└── Order C → Warehouse EU (ShipBob)  → FulfilmentProviderReference: "SB-456"
```

**Pre-Fulfilment Order Splitting:**

Orders are split by warehouse during checkout (via `IOrderGroupingStrategy`). By the time an order reaches the fulfilment system:
- Each `Order` entity contains items from **one warehouse only**
- The `Order.WarehouseId` determines which fulfilment provider handles it
- Multiple orders from the same invoice may go to different 3PLs

---

## Extended Order Model

Add these fields to the existing `Order` model:

```csharp
public class Order
{
    // ... existing fields ...

    // NEW: ExtendedData (Order doesn't currently have this - needs adding)
    public Dictionary<string, object> ExtendedData { get; set; } = [];

    // Fulfilment Provider Tracking
    public Guid? FulfilmentProviderConfigurationId { get; set; }
    public virtual FulfilmentProviderConfiguration? FulfilmentProviderConfiguration { get; set; }

    public string? FulfilmentProviderReference { get; set; }  // 3PL's order ID (e.g., "SB-12345")
    public DateTime? FulfilmentSubmittedAt { get; set; }
    public string? FulfilmentErrorMessage { get; set; }
    public int FulfilmentRetryCount { get; set; }
}
```

> **Note:** The Order model currently lacks `ExtendedData`. This needs to be added to support provider-specific data storage.

## Extended Shipment Model

The `Shipment` model **already has** tracking fields:

```csharp
public class Shipment
{
    // ... existing fields ...

    // EXISTING: Carrier tracking (already implemented)
    public string? TrackingNumber { get; set; }  // Already exists
    public string? TrackingUrl { get; set; }     // Already exists
    public string? Carrier { get; set; }         // Already exists (not "CarrierName")

    // NEW: ExtendedData (Shipment doesn't currently have this - needs adding)
    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
```

> **Note:** The Shipment model already has `TrackingNumber`, `TrackingUrl`, and `Carrier`. Only `ExtendedData` needs to be added for provider-specific data.

## OrderStatus Extension

Add **one** new value to the existing `OrderStatus` enum:

```csharp
public enum OrderStatus
{
    // Existing - unchanged (values match current implementation)
    Pending = 0,
    AwaitingStock = 10,
    ReadyToFulfill = 20,    // Note: American spelling (matches codebase)
    Processing = 30,         // Covers: Submitted to 3PL, Acknowledged, Picking/Packing
    PartiallyShipped = 40,
    Shipped = 50,
    Completed = 60,          // Covers: Delivered
    Cancelled = 70,
    OnHold = 80,             // Covers: 3PL Exception, 3PL OnHold

    // NEW
    FulfilmentFailed = 90    // Submission to 3PL failed after max retries
}
```

### Status Mapping

| 3PL Event | → OrderStatus | Notes |
|-----------|---------------|-------|
| Order created, no 3PL | `Pending` → `ReadyToFulfill` | Normal flow |
| Submitted to 3PL | `Processing` | Sent, awaiting acknowledgement |
| 3PL acknowledged | `Processing` | 3PL confirmed receipt |
| 3PL picking/packing | `Processing` | Being fulfilled |
| 3PL shipped (partial) | `PartiallyShipped` | Some items shipped |
| 3PL shipped (all) | `Shipped` | All items shipped |
| 3PL delivered | `Completed` | Customer received |
| 3PL problem/exception | `OnHold` | Needs attention |
| 3PL cancelled | `Cancelled` | Cancelled at 3PL |
| Submission failed (max retries) | `FulfilmentFailed` | Manual intervention needed |

**No sync handler needed** - we set `OrderStatus` directly based on 3PL events.

---

## ExtendedData Keys

Use existing `ExtendedData` dictionary for provider-specific information:

### Order ExtendedData Keys

| Key | Description | Example |
|-----|-------------|---------|
| `Fulfilment:ProviderShipmentIds` | JSON array of 3PL shipment IDs | `["shp_123", "shp_456"]` |
| `Fulfilment:AcknowledgedAt` | When 3PL acknowledged (if needed) | `"2025-01-21T10:30:00Z"` |
| `Fulfilment:ProviderData` | Provider-specific JSON | `{"detailStatus": 102}` |

### Shipment ExtendedData Keys

| Key | Description | Example |
|-----|-------------|---------|
| `Fulfilment:ProviderShipmentId` | 3PL's shipment ID | `"shp_abc123"` |
| `Fulfilment:ServiceName` | Service level | `"Ground"`, `"Express"` |
| `Fulfilment:ProviderData` | Provider-specific JSON | `{"timeline": [...]}` |

---

## Database Schema

> **Naming Convention:** Tables use `merchello{TableName}` in camelCase (e.g., `merchelloOrders`, `merchelloShipments`).

### Updates to Existing Tables

**merchelloOrders:**

| Column | Type | Description |
|--------|------|-------------|
| ExtendedData | NVARCHAR(MAX) | JSON dictionary (NEW - doesn't exist yet) |
| FulfilmentProviderConfigurationId | UNIQUEIDENTIFIER | FK to provider config (nullable) |
| FulfilmentProviderReference | NVARCHAR(255) | 3PL's order ID |
| FulfilmentSubmittedAt | DATETIME2 | When sent to 3PL |
| FulfilmentErrorMessage | NVARCHAR(MAX) | Last error |
| FulfilmentRetryCount | INT | Retry count (default 0) |

**merchelloShipments:**

| Column | Type | Description |
|--------|------|-------------|
| TrackingNumber | NVARCHAR(255) | **Already exists** |
| TrackingUrl | NVARCHAR(1000) | **Already exists** |
| Carrier | NVARCHAR(100) | **Already exists** (not "CarrierName") |
| ExtendedData | NVARCHAR(MAX) | JSON dictionary (NEW - doesn't exist yet) |

**merchelloWarehouses:**

| Column | Type | Description |
|--------|------|-------------|
| FulfilmentProviderConfigurationId | UNIQUEIDENTIFIER | FK to provider config (nullable) |

**merchelloSuppliers:**

| Column | Type | Description |
|--------|------|-------------|
| DefaultFulfilmentProviderConfigurationId | UNIQUEIDENTIFIER | FK to provider config (nullable) |

### New Tables

**merchelloFulfilmentProviderConfigurations:**

| Column | Type | Description |
|--------|------|-------------|
| Id | UNIQUEIDENTIFIER | Primary key |
| ProviderKey | NVARCHAR(256) | Matches provider metadata key (e.g., "shipbob") |
| DisplayName | NVARCHAR(256) | Custom display name |
| IsEnabled | BIT | Whether this provider is active |
| InventorySyncMode | INT | 0=Full, 1=Delta |
| SettingsJson | NVARCHAR(4000) | JSON configuration (API keys, etc.) |
| SortOrder | INT | Display order (default 0) |
| CreateDate | DATETIME2 | Created timestamp (matches existing pattern) |
| UpdateDate | DATETIME2 | Updated timestamp (matches existing pattern) |

> **Note:** Column naming follows existing `ShippingProviderConfiguration` pattern: `CreateDate`/`UpdateDate` not `DateCreated`/`DateUpdated`.

**merchelloFulfilmentSyncLogs:**

| Column | Type | Description |
|--------|------|-------------|
| Id | UNIQUEIDENTIFIER | Primary key |
| ProviderConfigurationId | UNIQUEIDENTIFIER | FK to provider config |
| SyncType | INT | 0=ProductsOut, 1=InventoryIn |
| Status | INT | 0=Pending, 1=Running, 2=Completed, 3=Failed |
| ItemsProcessed | INT | Total items attempted |
| ItemsSucceeded | INT | Successful items |
| ItemsFailed | INT | Failed items |
| ErrorMessage | NVARCHAR(MAX) | Error details |
| StartedAt | DATETIME2 | |
| CompletedAt | DATETIME2 | |

**merchelloFulfilmentWebhookLogs:**

| Column | Type | Description |
|--------|------|-------------|
| Id | UNIQUEIDENTIFIER | Primary key |
| ProviderConfigurationId | UNIQUEIDENTIFIER | FK to provider config |
| MessageId | NVARCHAR(256) | Provider's webhook ID (indexed, unique per provider) |
| EventType | NVARCHAR(100) | e.g., "shipment.created" |
| Payload | NVARCHAR(MAX) | Raw webhook body (for debugging) |
| ProcessedAt | DATETIME2 | When processed |
| ExpiresAt | DATETIME2 | TTL for cleanup (default: 7 days) |

### Summary

| Change Type | Count |
|-------------|-------|
| New tables | 3 |
| New columns on merchelloOrders | 6 (including ExtendedData) |
| New columns on merchelloShipments | 1 (ExtendedData only - tracking already exists) |
| New columns on merchelloWarehouses | 1 |
| New columns on merchelloSuppliers | 1 |
| New OrderStatus value | 1 |

> **Note:** The 3 new tables are: `FulfilmentProviderConfiguration`, `FulfilmentSyncLog`, and `FulfilmentWebhookLog`.

---

## Four Data Flows

### 1. Orders OUT

Send orders to 3PL when created.

```
OrderCreatedNotification
    ↓
FulfilmentOrderSubmissionHandler
    ↓
GUARD: If Order.FulfilmentProviderReference is NOT null → Skip (already submitted)
GUARD: If Order.Status == Processing → Skip (submission in progress)
    ↓
Resolve provider:
    config = Order.Warehouse.FulfilmentProviderConfigurationId
             ?? Order.Warehouse.Supplier.DefaultFulfilmentProviderConfigurationId
    ↓
If config is NULL → Manual fulfilment (stop)
If config.IsEnabled = false → Manual fulfilment (stop)
If !provider.SupportsOrderSubmission → Manual fulfilment (stop)
    ↓
Update Order:
    - FulfilmentProviderConfigurationId = config.Id
    - Status = Processing
    ↓
IFulfilmentProvider.SubmitOrderAsync()
    ↓
On success:
    - FulfilmentProviderReference = "SB-12345"
    - FulfilmentSubmittedAt = DateTime.UtcNow
    ↓
On failure:
    - FulfilmentErrorMessage = error
    - FulfilmentRetryCount++
    - Schedule retry (or set Status = FulfilmentFailed if max retries)
```

> **Manual Fulfilment:** When no provider is configured (`config = NULL`), orders remain in `ReadyToFulfill` status. Warehouse staff can create shipments manually via the backoffice shipment UI using the existing `IShipmentService.CreateAsync()`. Order status transitions follow the normal flow (Processing → Shipped → Completed).

### 2. Fulfilments IN

Receive tracking/shipment updates from 3PL.

**Webhook Flow:**
```
POST /umbraco/merchello/webhooks/fulfilment/{providerKey}
    ↓
IFulfilmentProvider.ValidateWebhookAsync()
    ↓
IFulfilmentProvider.ProcessWebhookAsync()
    ↓
Find Order by FulfilmentProviderReference
    ↓
For each shipment in payload:
    ↓
    Create/Update Shipment:
        - TrackingNumber, TrackingUrl, Carrier (existing fields)
        - ExtendedData["Fulfilment:ProviderShipmentId"] = "shp_123"
    ↓
    ShipmentCreatedNotification / ShipmentSavingNotification (existing)
    ↓
    IInventoryService.AllocateAsync() (existing)
    ↓
Update Order.Status:
    - All shipped → Shipped
    - Some shipped → PartiallyShipped
    - All delivered → Completed
    - Problem → OnHold
```

**Polling Flow** (fallback if no webhooks):
```
FulfilmentPollingJob
    ↓
Query Orders where FulfilmentProviderConfigurationId = config.Id
                AND Status IN (Processing, PartiallyShipped, Shipped)
    ↓
IFulfilmentProvider.PollOrderStatusAsync(providerReferences)
    ↓
Process updates (same as webhook)
```

### 3. Products OUT

Push product catalog to 3PL.

```
Manual trigger OR ProductSavedNotification (if configured)
    ↓
IFulfilmentSyncService.SyncProductsAsync(providerConfigId)
    ↓
IFulfilmentProvider.SyncProductsAsync(products)
    ↓
Create FulfilmentSyncLog record
    ↓
FulfilmentProductSyncedNotification
```

### 4. Inventory IN

Receive stock levels from 3PL.

```
Webhook OR FulfilmentPollingJob
    ↓
IFulfilmentProvider.GetInventoryLevelsAsync()
    ↓
Update ProductWarehouse.Stock:
    - Full mode: Overwrite completely
    - Delta mode: Apply adjustments
    ↓
Create FulfilmentSyncLog record
    ↓
FulfilmentInventoryUpdatedNotification
    ↓
LowStockNotification if thresholds crossed (existing)
```

**Note:** `Reserved` stock is always managed by Merchello, regardless of sync mode.

### 5. Order Cancellation

When an order is cancelled in Merchello:

```
OrderCancelledNotification (or status change to Cancelled)
    ↓
FulfilmentCancellationHandler
    ↓
If Order.FulfilmentProviderReference is NOT null:
    AND Order.Status was Processing/PartiallyShipped:
    ↓
    IFulfilmentProvider.CancelOrderAsync(FulfilmentProviderReference)
    ↓
    On success: Log cancellation, clear FulfilmentProviderReference
    On failure: Log error (order already cancelled in Merchello, 3PL state may differ)
```

**Note:** Cancellation at 3PL is best-effort. If the order is already shipped, 3PL will reject the cancellation.

---

## Warehouse/Supplier Linkage

### Hierarchical Resolution

```csharp
var config = warehouse.FulfilmentProviderConfigurationId    // Warehouse override
    ?? warehouse.Supplier?.DefaultFulfilmentProviderConfigurationId;  // Supplier default

// If null → manual fulfilment
```

### Model Changes

```csharp
// Warehouse.cs
public Guid? FulfilmentProviderConfigurationId { get; set; }
public virtual FulfilmentProviderConfiguration? FulfilmentProviderConfiguration { get; set; }

// Supplier.cs
public Guid? DefaultFulfilmentProviderConfigurationId { get; set; }
public virtual FulfilmentProviderConfiguration? DefaultFulfilmentProviderConfiguration { get; set; }
```

---

## Key Interfaces

### Architecture Note: GraphQL Support

While most 3PLs use REST APIs, **ShipHero uses GraphQL**. The architecture accommodates this via:

1. **API Style metadata** - `FulfilmentProviderMetadata.ApiStyle` indicates REST, GraphQL, or SFTP
2. **Abstract provider interface** - `IFulfilmentProvider` is implementation-agnostic
3. **Provider-specific clients** - Each provider implements its own HTTP client (REST or GraphQL)

GraphQL providers like ShipHero handle:
- Query/mutation building internally
- Rate limiting via credit system
- Token refresh for JWT authentication

### Webhook Signature Validation

Different providers use different webhook authentication:

| Provider | Method | Header |
|----------|--------|--------|
| ShipBob | HMAC + timestamp | `webhook-signature`, `webhook-timestamp` |
| ShipMonk | HMAC-SHA512 | `X-Sm-Signature` |
| ShipHero | Message ID (deduplication) | `X-Shiphero-Message-ID` |

The `ValidateWebhookAsync` method on `IFulfilmentProvider` handles provider-specific validation.

### IFulfilmentService

```csharp
public interface IFulfilmentService
{
    Task<CrudResult<Order>> SubmitOrderAsync(Guid orderId, CancellationToken ct = default);
    Task<CrudResult<Order>> RetrySubmissionAsync(Guid orderId, CancellationToken ct = default);
    Task<CrudResult<Order>> CancelOrderAsync(Guid orderId, CancellationToken ct = default);
    Task<CrudResult<Order>> ProcessStatusUpdateAsync(FulfilmentStatusUpdate update, CancellationToken ct = default);
    Task<CrudResult<Shipment>> ProcessShipmentUpdateAsync(FulfilmentShipmentUpdate update, CancellationToken ct = default);
    Task<IReadOnlyList<Order>> GetOrdersForPollingAsync(Guid providerConfigId, CancellationToken ct = default);
    Task<FulfilmentProviderConfiguration?> ResolveProviderForWarehouseAsync(Guid warehouseId, CancellationToken ct = default);
}
```

### IFulfilmentSyncService

```csharp
public interface IFulfilmentSyncService
{
    Task<FulfilmentSyncLog> SyncProductsAsync(Guid providerConfigId, CancellationToken ct = default);
    Task<FulfilmentSyncLog> SyncInventoryAsync(Guid providerConfigId, CancellationToken ct = default);
    Task<PagedResult<FulfilmentSyncLog>> GetSyncHistoryAsync(FulfilmentSyncLogQueryParameters parameters, CancellationToken ct = default);
}
```

### IFulfilmentProvider

```csharp
/// <summary>
/// Contract that fulfilment provider plugins must implement.
/// Pattern follows IShippingProvider for consistency.
/// </summary>
public interface IFulfilmentProvider
{
    /// <summary>
    /// Static metadata describing the provider.
    /// </summary>
    FulfilmentProviderMetadata Metadata { get; }

    // Configuration (use ValueTask like IShippingProvider)
    ValueTask<IEnumerable<FulfilmentProviderConfigurationField>> GetConfigurationFieldsAsync(CancellationToken ct = default);
    ValueTask ConfigureAsync(FulfilmentProviderConfiguration? configuration, CancellationToken ct = default);
    Task<FulfilmentConnectionTestResult> TestConnectionAsync(CancellationToken ct = default);

    // Orders
    Task<FulfilmentOrderResult> SubmitOrderAsync(FulfilmentOrderRequest request, CancellationToken ct = default);
    Task<FulfilmentCancelResult> CancelOrderAsync(string providerReference, CancellationToken ct = default);

    // Webhooks
    Task<bool> ValidateWebhookAsync(HttpRequest request, CancellationToken ct = default);
    Task<FulfilmentWebhookResult> ProcessWebhookAsync(HttpRequest request, CancellationToken ct = default);

    // Polling
    Task<IReadOnlyList<FulfilmentStatusUpdate>> PollOrderStatusAsync(IEnumerable<string> providerReferences, CancellationToken ct = default);

    // Sync
    Task<FulfilmentSyncResult> SyncProductsAsync(IEnumerable<FulfilmentProduct> products, CancellationToken ct = default);
    Task<IReadOnlyList<FulfilmentInventoryLevel>> GetInventoryLevelsAsync(CancellationToken ct = default);
}
```

> **Note:** Configuration methods use `ValueTask` to match `IShippingProvider` pattern. `ConfigureAsync` receives the full configuration object, not just a dictionary.

### IFulfilmentProviderManager

```csharp
/// <summary>
/// Manages discovery and resolution of fulfilment provider implementations.
/// Pattern follows IShippingProviderManager.
/// </summary>
public interface IFulfilmentProviderManager
{
    /// <summary>
    /// Gets all discovered provider implementations.
    /// </summary>
    IReadOnlyList<IFulfilmentProvider> GetAllProviders();

    /// <summary>
    /// Gets a provider by its metadata key.
    /// </summary>
    IFulfilmentProvider? GetProvider(string providerKey);

    /// <summary>
    /// Gets a configured provider instance with settings applied.
    /// </summary>
    Task<IFulfilmentProvider?> GetConfiguredProviderAsync(Guid configurationId, CancellationToken ct = default);
}
```

---

## Provider Capabilities

```csharp
/// <summary>
/// Immutable metadata describing a fulfilment provider implementation.
/// Pattern follows ShippingProviderMetadata (record with required init properties).
/// </summary>
public record FulfilmentProviderMetadata
{
    /// <summary>
    /// Unique key identifying this provider (e.g., "shipbob", "helm-wms").
    /// </summary>
    public required string Key { get; init; }

    /// <summary>
    /// Display name shown in the backoffice UI.
    /// </summary>
    public required string DisplayName { get; init; }

    /// <summary>
    /// Umbraco icon class for fallback display (e.g., "icon-box").
    /// Used when IconSvg is not provided.
    /// </summary>
    public string? Icon { get; init; }

    /// <summary>
    /// SVG markup for brand logo display. Takes precedence over Icon when present.
    /// Should be a complete SVG element with viewBox for proper scaling (24x24 recommended).
    /// Example: "&lt;svg viewBox=\"0 0 24 24\" fill=\"currentColor\"&gt;...&lt;/svg&gt;"
    /// </summary>
    public string? IconSvg { get; init; }

    /// <summary>
    /// Brief description of the provider's capabilities.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Markdown-formatted setup instructions displayed in the configuration modal.
    /// </summary>
    public string? SetupInstructions { get; init; }

    // Capabilities
    public bool SupportsOrderSubmission { get; init; }
    public bool SupportsOrderCancellation { get; init; }
    public bool SupportsWebhooks { get; init; }
    public bool SupportsPolling { get; init; }
    public bool SupportsProductSync { get; init; }
    public bool SupportsInventorySync { get; init; }

    /// <summary>
    /// API style used by the provider. Affects how the provider client is implemented.
    /// </summary>
    public FulfilmentApiStyle ApiStyle { get; init; } = FulfilmentApiStyle.Rest;
}

/// <summary>
/// API communication style used by a fulfilment provider.
/// </summary>
public enum FulfilmentApiStyle
{
    Rest = 0,
    GraphQL = 1,
    Sftp = 2
}
```

### FulfilmentProviderConfigurationField

```csharp
/// <summary>
/// Describes a configuration field for provider setup UI.
/// Pattern follows ShippingProviderConfigurationField.
/// </summary>
public record FulfilmentProviderConfigurationField
{
    public required string Key { get; init; }
    public required string Label { get; init; }
    public required string Type { get; init; }  // "text", "password", "number", "select", "checkbox"
    public bool Required { get; init; }
    public string? DefaultValue { get; init; }
    public string? Description { get; init; }
    public string? Placeholder { get; init; }
    public IReadOnlyList<SelectOption>? Options { get; init; }  // For "select" type
}

public record SelectOption(string Value, string Label);
```

| Provider | Orders | Cancel | Webhooks | Polling | Products | Inventory | API Style |
|----------|--------|--------|----------|---------|----------|-----------|-----------|
| ShipBob | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | REST |
| ShipMonk | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | REST |
| ShipHero | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | GraphQL |
| Helm WMS | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | SFTP |

---

## Notifications

### Fulfilment-Specific

| Notification | When Published |
|--------------|----------------|
| `FulfilmentSubmittingNotification` | Before submitting to 3PL (cancelable) |
| `FulfilmentSubmittedNotification` | After successful submission |
| `FulfilmentSubmissionFailedNotification` | After max retries exceeded |
| `FulfilmentInventoryUpdatedNotification` | After inventory sync |
| `FulfilmentProductSyncedNotification` | After product sync |

### Leverages Existing

| Event | Existing Notification |
|-------|----------------------|
| Shipment created | `ShipmentCreatedNotification` |
| Shipment status changed | `ShipmentStatusChangedNotification` |
| Order status changed | `OrderStatusChangedNotification` |
| Stock allocated | `StockAllocatedNotification` |
| Low stock | `LowStockNotification` |

### UCP Integration Note

When orders originate from UCP (AI agents), additional notification handling is required:

| Notification | UCP Action Needed |
|--------------|-------------------|
| `OrderStatusChangedNotification` | Check if Invoice.Source.Type == "ucp", aggregate order statuses, send UCP webhook |
| `ShipmentCreatedNotification` | Check if all Orders for Invoice have shipped, trigger UCP order.shipped webhook |

**Key Point**: UCP expects one "order" per checkout. Merchello has multiple Orders per Invoice (one per warehouse). The UCP webhook handler must:
1. Check if order is from UCP (`Invoice.Source.Type == "ucp"`)
2. Aggregate status across ALL orders for the invoice
3. Only send webhook when aggregate status changes (e.g., all shipped)
4. Read webhook URL from `Invoice.ExtendedData["UcpWebhookUrl"]`

See `docs/UCP.md` "UCP Order Webhooks Implementation Gap" section for full details.

---

## Webhook & Email Topics

### Outbound Webhooks

```csharp
public class FulfilmentWebhookTopics : IWebhookTopicRegistration
{
    public void Register(IWebhookTopicRegistry registry)
    {
        registry.Register("fulfilment.submitted", typeof(FulfilmentSubmittedNotification));
        registry.Register("fulfilment.failed", typeof(FulfilmentSubmissionFailedNotification));
        registry.Register("fulfilment.inventory.updated", typeof(FulfilmentInventoryUpdatedNotification));
        // Shipped/delivered use existing order.* and shipment.* topics
    }
}
```

### Email Topics

| Topic | Trigger | Template |
|-------|---------|----------|
| `shipment.created` | ShipmentCreatedNotification | Includes tracking info |
| `order.completed` | OrderStatusChangedNotification (Completed) | Delivery confirmation |
| `fulfilment.failed` | FulfilmentSubmissionFailedNotification | Admin alert (order requires manual intervention) |

---

## API Endpoints

### Provider Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/fulfilment-providers/available` | List discovered providers |
| GET | `/api/v1/fulfilment-providers` | List configured providers |
| GET | `/api/v1/fulfilment-providers/{id}` | Get provider config |
| POST | `/api/v1/fulfilment-providers` | Create config |
| PUT | `/api/v1/fulfilment-providers/{id}` | Update config |
| DELETE | `/api/v1/fulfilment-providers/{id}` | Delete config |
| POST | `/api/v1/fulfilment-providers/{id}/test` | Test connection |

### Assignment

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/v1/warehouses/{id}/fulfilment-provider` | Assign to warehouse |
| DELETE | `/api/v1/warehouses/{id}/fulfilment-provider` | Remove from warehouse |
| PUT | `/api/v1/suppliers/{id}/default-fulfilment-provider` | Set supplier default |
| DELETE | `/api/v1/suppliers/{id}/default-fulfilment-provider` | Remove supplier default |

### Order Fulfilment

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/orders/{id}/fulfilment` | Get fulfilment status |
| POST | `/api/v1/orders/{id}/fulfilment/submit` | Manual submit/retry |
| POST | `/api/v1/orders/{id}/fulfilment/cancel` | Cancel at 3PL |

### Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/fulfilment-providers/{id}/sync/products` | Trigger product sync |
| POST | `/api/v1/fulfilment-providers/{id}/sync/inventory` | Trigger inventory sync |
| GET | `/api/v1/fulfilment-providers/{id}/sync/history` | Get sync logs |

### Inbound Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/umbraco/merchello/webhooks/fulfilment/{providerKey}` | 3PL status updates |

---

## File Structure

```
src/Merchello.Core/Fulfilment/
├── Dtos/
│   ├── FulfilmentProviderDto.cs
│   ├── FulfilmentProviderListItemDto.cs
│   ├── CreateFulfilmentProviderConfigurationDto.cs
│   ├── UpdateFulfilmentProviderConfigurationDto.cs
│   └── FulfilmentSyncLogDto.cs
├── Mapping/
│   ├── FulfilmentProviderConfigurationDbMapping.cs
│   ├── FulfilmentSyncLogDbMapping.cs
│   └── FulfilmentWebhookLogDbMapping.cs
├── Models/
│   ├── FulfilmentProviderConfiguration.cs
│   ├── FulfilmentSyncLog.cs
│   ├── FulfilmentWebhookLog.cs
│   ├── FulfilmentSyncType.cs
│   ├── FulfilmentSyncStatus.cs
│   ├── InventorySyncMode.cs
│   ├── FulfilmentOrderRequest.cs
│   ├── FulfilmentOrderResult.cs
│   ├── FulfilmentStatusUpdate.cs
│   ├── FulfilmentShipmentUpdate.cs
│   ├── FulfilmentInventoryLevel.cs
│   ├── FulfilmentProduct.cs
│   ├── FulfilmentCancelResult.cs
│   ├── FulfilmentSyncResult.cs
│   ├── FulfilmentWebhookResult.cs
│   └── FulfilmentConnectionTestResult.cs
├── Notifications/
│   ├── FulfilmentSubmittingNotification.cs
│   ├── FulfilmentSubmittedNotification.cs
│   ├── FulfilmentSubmissionFailedNotification.cs
│   ├── FulfilmentInventoryUpdatedNotification.cs
│   └── FulfilmentProductSyncedNotification.cs
├── Providers/
│   ├── Interfaces/
│   │   ├── IFulfilmentProvider.cs
│   │   └── IFulfilmentProviderManager.cs
│   ├── FulfilmentProviderBase.cs
│   ├── FulfilmentProviderManager.cs
│   ├── FulfilmentProviderMetadata.cs
│   ├── FulfilmentProviderConfigurationField.cs
│   └── FulfilmentApiStyle.cs
├── Services/
│   ├── Interfaces/
│   │   ├── IFulfilmentService.cs
│   │   └── IFulfilmentSyncService.cs
│   ├── Parameters/
│   │   └── FulfilmentSyncLogQueryParameters.cs
│   ├── FulfilmentService.cs
│   ├── FulfilmentSyncService.cs
│   ├── FulfilmentPollingJob.cs
│   ├── FulfilmentRetryJob.cs
│   └── FulfilmentCleanupJob.cs
├── Handlers/
│   ├── FulfilmentOrderSubmissionHandler.cs
│   └── FulfilmentCancellationHandler.cs
└── Composition/
    ├── FulfilmentComposer.cs
    └── FulfilmentWebhookTopics.cs

src/Merchello/Controllers/
├── FulfilmentProvidersApiController.cs
└── FulfilmentWebhookController.cs

src/Merchello/Client/src/fulfilment-providers/
├── manifest.ts                                      # Umbraco extension manifests
├── components/
│   └── fulfilment-providers-list.element.ts         # Main list view (workspaceView)
├── modals/
│   ├── fulfilment-provider-config-modal.element.ts  # Configuration modal
│   ├── fulfilment-provider-config-modal.token.ts
│   ├── test-provider-modal.element.ts               # Test modal (see Admin Test UI)
│   └── test-provider-modal.token.ts
├── types/
│   └── fulfilment-providers.types.ts                # TypeScript DTOs
└── utils/
    └── brand-icons.ts                               # SVG brand icons for providers
```

### Provider Implementations (Optional)

When implemented, providers live under `src/Merchello.Core/Fulfilment/Providers/`:

```
src/Merchello.Core/Fulfilment/Providers/
├── ShipBob/
│   ├── ShipBobFulfilmentProvider.cs
│   ├── ShipBobApiClient.cs
│   └── ShipBobWebhookValidator.cs
├── ShipMonk/
│   ├── ShipMonkFulfilmentProvider.cs
│   ├── ShipMonkApiClient.cs
│   └── ShipMonkWebhookValidator.cs
├── ShipHero/
│   ├── ShipHeroFulfilmentProvider.cs
│   ├── ShipHeroGraphQLClient.cs
│   ├── ShipHeroTokenManager.cs
│   └── ShipHeroWebhookProcessor.cs
└── HelmWms/
    ├── HelmWmsFulfilmentProvider.cs
    ├── HelmWmsSftpClient.cs
    └── HelmWmsFileParser.cs
```

---

## Request/Response Models

These models are used for communication between the fulfilment service and provider implementations.

### FulfilmentOrderRequest

Sent to `IFulfilmentProvider.SubmitOrderAsync()`:

```csharp
/// <summary>
/// Request to submit an order to a fulfilment provider.
/// </summary>
public record FulfilmentOrderRequest
{
    public required Guid OrderId { get; init; }
    public required string OrderNumber { get; init; }
    public required IReadOnlyList<FulfilmentLineItem> LineItems { get; init; }
    public required FulfilmentAddress ShippingAddress { get; init; }
    public FulfilmentAddress? BillingAddress { get; init; }
    public string? CustomerEmail { get; init; }
    public string? CustomerPhone { get; init; }
    public string? ShippingServiceCode { get; init; }  // Resolved from service category/default mapping
    public DateTime? RequestedDeliveryDate { get; init; }
    public string? InternalNotes { get; init; }
    public Dictionary<string, object> ExtendedData { get; init; } = [];
}

/// <summary>
/// Line item within a fulfilment order request.
/// </summary>
public record FulfilmentLineItem
{
    public required Guid LineItemId { get; init; }
    public required string Sku { get; init; }
    public required string Name { get; init; }
    public required int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
    public decimal? Weight { get; init; }
    public string? Barcode { get; init; }
    public Dictionary<string, object> ExtendedData { get; init; } = [];
}

/// <summary>
/// Address for fulfilment requests.
/// </summary>
public record FulfilmentAddress
{
    public string? Name { get; init; }
    public string? Company { get; init; }
    public required string Address1 { get; init; }
    public string? Address2 { get; init; }
    public required string City { get; init; }
    public string? StateOrProvince { get; init; }
    public required string PostalCode { get; init; }
    public required string CountryCode { get; init; }
    public string? Phone { get; init; }
}
```

### FulfilmentOrderResult

Returned from `IFulfilmentProvider.SubmitOrderAsync()`:

```csharp
/// <summary>
/// Result of submitting an order to a fulfilment provider.
/// </summary>
public record FulfilmentOrderResult
{
    public bool Success { get; init; }
    public string? ProviderReference { get; init; }  // 3PL's order ID
    public string? ErrorMessage { get; init; }
    public string? ErrorCode { get; init; }
    public Dictionary<string, object> ExtendedData { get; init; } = [];

    public static FulfilmentOrderResult Succeeded(string providerReference)
        => new() { Success = true, ProviderReference = providerReference };

    public static FulfilmentOrderResult Failed(string errorMessage, string? errorCode = null)
        => new() { Success = false, ErrorMessage = errorMessage, ErrorCode = errorCode };
}
```

### FulfilmentStatusUpdate

Used for webhook/polling status updates:

```csharp
/// <summary>
/// Status update received from a fulfilment provider.
/// </summary>
public record FulfilmentStatusUpdate
{
    public required string ProviderReference { get; init; }
    public required string ProviderStatus { get; init; }  // Raw status from 3PL
    public required OrderStatus MappedStatus { get; init; }  // Mapped to Merchello status
    public DateTime StatusDate { get; init; } = DateTime.UtcNow;
    public string? ErrorMessage { get; init; }
    public Dictionary<string, object> ExtendedData { get; init; } = [];
}
```

### FulfilmentShipmentUpdate

Used when a 3PL reports shipment details:

```csharp
/// <summary>
/// Shipment update received from a fulfilment provider.
/// </summary>
public record FulfilmentShipmentUpdate
{
    public required string ProviderReference { get; init; }  // Order's provider reference
    public required string ProviderShipmentId { get; init; }  // 3PL's shipment ID
    public string? TrackingNumber { get; init; }
    public string? TrackingUrl { get; init; }
    public string? Carrier { get; init; }
    public DateTime? ShippedDate { get; init; }
    public IReadOnlyList<FulfilmentShippedItem>? Items { get; init; }
}

/// <summary>
/// Individual item within a shipment (for partial shipments).
/// </summary>
public record FulfilmentShippedItem
{
    public required string Sku { get; init; }
    public required int QuantityShipped { get; init; }
}
```

### FulfilmentProduct

Used for product sync:

```csharp
/// <summary>
/// Product data sent to a fulfilment provider during sync.
/// </summary>
public record FulfilmentProduct
{
    public required Guid ProductId { get; init; }
    public required string Sku { get; init; }
    public required string Name { get; init; }
    public string? Barcode { get; init; }
    public decimal? Weight { get; init; }
    public decimal? Length { get; init; }
    public decimal? Width { get; init; }
    public decimal? Height { get; init; }
    public decimal? Cost { get; init; }
    public string? CountryOfOrigin { get; init; }
    public string? HsCode { get; init; }
    public Dictionary<string, object> ExtendedData { get; init; } = [];
}
```

### FulfilmentInventoryLevel

Returned from `IFulfilmentProvider.GetInventoryLevelsAsync()`:

```csharp
/// <summary>
/// Inventory level reported by a fulfilment provider.
/// </summary>
public record FulfilmentInventoryLevel
{
    public required string Sku { get; init; }
    public string? WarehouseCode { get; init; }  // Provider's warehouse identifier
    public required int AvailableQuantity { get; init; }
    public int? ReservedQuantity { get; init; }
    public int? IncomingQuantity { get; init; }
    public DateTime? LastUpdated { get; init; }
}
```

### Other Result Types

```csharp
/// <summary>
/// Result of cancelling an order at a fulfilment provider.
/// </summary>
public record FulfilmentCancelResult
{
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }

    public static FulfilmentCancelResult Succeeded() => new() { Success = true };
    public static FulfilmentCancelResult Failed(string error) => new() { Success = false, ErrorMessage = error };
    public static FulfilmentCancelResult NotSupported() => Failed("Provider does not support order cancellation");
}

/// <summary>
/// Result of a product/inventory sync operation.
/// </summary>
public record FulfilmentSyncResult
{
    public bool Success { get; init; }
    public int ItemsProcessed { get; init; }
    public int ItemsSucceeded { get; init; }
    public int ItemsFailed { get; init; }
    public IReadOnlyList<string> Errors { get; init; } = [];

    public static FulfilmentSyncResult NotSupported() => new() { Success = false, Errors = ["Provider does not support this sync operation"] };
}

/// <summary>
/// Result of processing a webhook from a fulfilment provider.
/// </summary>
public record FulfilmentWebhookResult
{
    public bool Success { get; init; }
    public string? EventType { get; init; }
    public IReadOnlyList<FulfilmentStatusUpdate> StatusUpdates { get; init; } = [];
    public IReadOnlyList<FulfilmentShipmentUpdate> ShipmentUpdates { get; init; } = [];
    public IReadOnlyList<FulfilmentInventoryLevel> InventoryUpdates { get; init; } = [];
    public string? ErrorMessage { get; init; }

    public static FulfilmentWebhookResult NotSupported() => new() { Success = false, ErrorMessage = "Provider does not support webhooks" };
}

/// <summary>
/// Result of testing connection to a fulfilment provider.
/// </summary>
public record FulfilmentConnectionTestResult
{
    public bool Success { get; init; }
    public string? ProviderVersion { get; init; }
    public string? AccountName { get; init; }
    public int? WarehouseCount { get; init; }
    public string? ErrorMessage { get; init; }
    public string? ErrorCode { get; init; }

    public static FulfilmentConnectionTestResult Succeeded(string? accountName = null, string? providerVersion = null)
        => new() { Success = true, AccountName = accountName, ProviderVersion = providerVersion };
    public static FulfilmentConnectionTestResult Failed(string error, string? errorCode = null)
        => new() { Success = false, ErrorMessage = error, ErrorCode = errorCode };
    public static FulfilmentConnectionTestResult NotSupported()
        => Failed("Provider does not support connection testing");
}
```

---

## Retry Logic

- Initial failure: Retry in 5 minutes
- Exponential backoff: 5, 15, 30, 60, 120 minutes
- Max retries: 5 (configurable)
- After max: `OrderStatus = FulfilmentFailed`

```csharp
public static class FulfilmentRetryPolicy
{
    public static readonly int[] DelaysMinutes = [5, 15, 30, 60, 120];

    public static TimeSpan GetNextDelay(int retryCount)
    {
        var index = Math.Min(retryCount, DelaysMinutes.Length - 1);
        return TimeSpan.FromMinutes(DelaysMinutes[index]);
    }
}
```

**FulfilmentRetryJob** runs every minute:
```csharp
// Find orders where:
// - Status = Processing (submitted but may have failed)
// - FulfilmentErrorMessage is not null
// - FulfilmentRetryCount < MaxRetries
// - Enough time has passed since last attempt
// Then retry submission
```

---

## Configuration

### appsettings.json

```json
{
  "Merchello": {
    "Fulfilment": {
      "Enabled": true,
      "PollingIntervalMinutes": 15,
      "MaxRetryAttempts": 5,
      "RetryDelaysMinutes": [5, 15, 30, 60, 120],
      "InventorySyncIntervalMinutes": 60,
      "ProductSyncOnSave": false,
      "SyncLogRetentionDays": 30,
      "WebhookLogRetentionDays": 7
    }
  }
}
```

### Provider Settings (SettingsJson)

**ShipBob:**
```json
{
  "ApiBaseUrl": "https://api.shipbob.com",
  "ApiVersion": "2025-07",
  "PersonalAccessToken": "pat_xxx...",
  "ChannelId": "12345",
  "WebhookSecret": "whsec_xxx..."
}
```

**ShipMonk:**
```json
{
  "ApiBaseUrl": "https://api.shipmonk.com",
  "ApiKey": "your-api-key",
  "StoreId": "12345",
  "WebhookSecret": "your-webhook-secret"
}
```

**ShipHero:**
```json
{
  "ApiBaseUrl": "https://public-api.shiphero.com",
  "Email": "api-user@example.com",
  "Password": "encrypted...",
  "RefreshToken": "stored-refresh-token...",
  "CustomerAccountId": "optional-for-3pl"
}
```

> **Note:** ShipHero uses JWT authentication with tokens that expire every 28 days. The provider must handle token refresh automatically using the stored refresh token.

**Helm WMS (SFTP):**
```json
{
  "SftpHost": "sftp.myhelm.app",
  "SftpUsername": "merchant_123",
  "SftpPassword": "encrypted...",
  "SftpPort": 22,
  "OrdersOutPath": "/orders/outbound",
  "FulfilmentsInPath": "/orders/inbound"
}
```

> **Security Note:** `SettingsJson` stores provider credentials (API keys, tokens, passwords). Following the existing codebase pattern (Payment/Shipping providers), the `IsSensitive` flag on `FulfilmentProviderConfigurationField` is used for **UI masking only** (renders password input fields). No encryption at rest is currently implemented. This is consistent across all provider types in Merchello.

---

## Implementation Phases

### Phase 1: Core Infrastructure (MVP)
- [x] Add `ExtendedData` to Order model (currently missing)
- [x] Add `ExtendedData` to Shipment model (currently missing)
- [x] Add fulfilment fields to Order model
- [x] Add FulfilmentProviderConfigurationId to Warehouse/Supplier
- [x] Add `FulfilmentFailed` to OrderStatus enum
- [x] Create FulfilmentProviderConfiguration table
- [x] Create FulfilmentSyncLog table
- [x] IFulfilmentProvider, IFulfilmentService interfaces
- [x] FulfilmentProviderManager (ExtensionManager discovery)
- [x] Basic API endpoints

> **Note:** Shipment tracking fields (`TrackingNumber`, `TrackingUrl`, `Carrier`) already exist. `CreateShipmentParameters` already supports these fields.

### Phase 2: Order Flow
- [x] FulfilmentSettings configuration model
- [x] FulfilmentOrderSubmissionHandler (auto-submit on OrderCreatedNotification)
- [x] FulfilmentCancellationHandler (cancel at 3PL on order cancellation)
- [x] FulfilmentService implementation
- [x] FulfilmentWebhookController (inbound webhooks from 3PLs)
- [x] FulfilmentRetryJob (background retry for failed submissions)

### Phase 3: Notifications
- [x] Fulfilment notifications (FulfilmentSubmittingNotification, FulfilmentSubmittedNotification, FulfilmentSubmissionFailedNotification, FulfilmentInventoryUpdatedNotification, FulfilmentProductSyncedNotification)
- [x] Webhook topic registration
- [x] Backoffice order detail showing fulfilment status

### Phase 4: Sync Features
- [x] FulfilmentSyncService
- [x] Product sync flow
- [x] Inventory sync flow (Full/Delta)
- [x] FulfilmentPollingJob

### Phase 5: Backoffice UI
- [x] Fulfilment workspaceView tab in Providers workspace (see [Backoffice UI Architecture](#backoffice-ui-architecture) below)
- [x] Fulfilment providers list component with configured/available sections
- [x] Provider configuration modal
- [x] Provider brand icons (SVG) in `utils/brand-icons.ts`
- [x] Supplier UI: fulfilment provider dropdown
- [x] Warehouse UI: optional provider override dropdown
- [x] Sync logs viewer
- [x] **Test Provider Modal** (see [Admin Test UI](#admin-test-ui) section below)
- [x] **Category-Based Shipping Mapping** - Provider config exposes `ServiceCategoryMapping_*` and `DefaultShippingMethod` fields for unified mapping across flat-rate and dynamic shipping providers.

### Phase 6: Integration Tests
- [x] Core infrastructure tests (FulfilmentProviderConfiguration, FulfilmentSyncLog models)
- [x] FulfilmentService tests (order submission, retry logic, status updates)
- [x] FulfilmentSyncService tests (product sync, inventory sync)
- [x] FulfilmentProviderBase tests (default implementations)
- [x] Webhook processing tests
- [x] Provider resolution tests (warehouse → supplier hierarchy)

---

## Optional Provider Implementations

These providers can be added to Merchello.Core after the core architecture is complete. They follow the same pattern as built-in payment and shipping providers.

### ShipBob Provider
- REST API client with 2025-07 version
- Webhook processing with signature validation
- Status mapping
- Product/inventory sync

### ShipMonk Provider
- REST API client
- HMAC-SHA512 webhook signature validation
- Status mapping (18 statuses)
- Product/inventory sync

### ShipHero Provider
- GraphQL client (different from REST providers)
- JWT token management with auto-refresh
- Rate limiting / credit management
- Webhook processing (message ID deduplication)
- 3-step fulfillment flow handling
- Status mapping
- Product/inventory sync

### Helm WMS Provider
- SSH.NET integration
- File generation/parsing

---

## Backoffice UI Architecture

> **Reference:** All UI patterns follow [Umbraco-Backoffice-Dev.md](./Umbraco-Backoffice-Dev.md) and existing Merchello provider patterns.

### Navigation Structure

Fulfilment providers appear as a **tab within the Providers workspace**, alongside Payment, Shipping, Tax, and Exchange Rates:

```
Merchello Section (sidebar menu)
└── Providers (tree item → workspace)
    ├── Payments    (workspaceView, weight: 100, icon: icon-credit-card)
    ├── Shipping    (workspaceView, weight: 90, icon: icon-truck)
    ├── Tax         (workspaceView, weight: 85, icon: icon-calculator)
    ├── Exchange    (workspaceView, weight: 80, icon: icon-globe)
    └── Fulfilment  (workspaceView, weight: 75, icon: icon-box) ← NEW
```

### Directory Structure

```
src/Merchello/Client/src/fulfilment-providers/
├── manifest.ts                           # Umbraco extension manifests
├── components/
│   └── fulfilment-providers-list.element.ts   # Main list view
├── modals/
│   ├── fulfilment-provider-config-modal.element.ts
│   ├── fulfilment-provider-config-modal.token.ts
│   ├── test-provider-modal.element.ts
│   └── test-provider-modal.token.ts
├── types/
│   └── fulfilment-providers.types.ts     # TypeScript DTOs
└── utils/
    └── brand-icons.ts                    # SVG brand icons for providers
```

### Manifest Registration

**manifest.ts:**

```typescript
import type { UmbExtensionManifest } from "@umbraco-cms/backoffice/extension-api";

export const manifests: Array<UmbExtensionManifest> = [
  // Tab in Providers workspace
  {
    type: "workspaceView",
    alias: "Merchello.Providers.FulfilmentProviders.View",
    name: "Fulfilment Providers View",
    js: () => import("./components/fulfilment-providers-list.element.js"),
    weight: 75,
    meta: {
      label: "Fulfilment",
      pathname: "fulfilment",
      icon: "icon-box",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Providers.Workspace",
      },
    ],
  },

  // Configuration modal
  {
    type: "modal",
    alias: "Merchello.FulfilmentProvider.Config.Modal",
    name: "Fulfilment Provider Configuration Modal",
    js: () => import("./modals/fulfilment-provider-config-modal.element.js"),
  },

  // Test modal
  {
    type: "modal",
    alias: "Merchello.TestFulfilmentProvider.Modal",
    name: "Test Fulfilment Provider Modal",
    js: () => import("./modals/test-provider-modal.element.js"),
  },
];
```

**bundle.manifests.ts** (add to existing):

```typescript
import { manifests as fulfilmentProviders } from "./fulfilment-providers/manifest.js";

export const manifests: Array<UmbExtensionManifest> = [
  // ... existing manifests ...
  ...fulfilmentProviders,
];
```

### Provider Icon/Logo Strategy

Following the Payment Providers pattern, Fulfilment Providers support **SVG brand icons** for visual recognition:

**FulfilmentProviderMetadata (updated):**

```csharp
public record FulfilmentProviderMetadata
{
    public required string Key { get; init; }
    public required string DisplayName { get; init; }

    /// <summary>
    /// Umbraco icon class for fallback display (e.g., "icon-box").
    /// </summary>
    public string? Icon { get; init; }

    /// <summary>
    /// SVG markup for brand logo display. Takes precedence over Icon when present.
    /// Should be a complete SVG element with viewBox for proper scaling.
    /// </summary>
    public string? IconSvg { get; init; }

    public string? Description { get; init; }
    public string? SetupInstructions { get; init; }

    // Capabilities...
}
```

**utils/brand-icons.ts:**

```typescript
// SVG icons for fulfilment provider brands
const FULFILMENT_PROVIDER_ICONS: Record<string, string> = {
  shipbob: `<svg viewBox="0 0 24 24" fill="currentColor"><!-- ShipBob logo --></svg>`,
  shipmonk: `<svg viewBox="0 0 24 24" fill="currentColor"><!-- ShipMonk logo --></svg>`,
  shiphero: `<svg viewBox="0 0 24 24" fill="currentColor"><!-- ShipHero logo --></svg>`,
  "helm-wms": `<svg viewBox="0 0 24 24" fill="currentColor"><!-- Helm WMS logo --></svg>`,
};

export function getFulfilmentProviderIconSvg(providerKey: string): string | undefined {
  return FULFILMENT_PROVIDER_ICONS[providerKey.toLowerCase()];
}
```

**Icon Rendering in Component:**

```typescript
private _renderProviderIcon(provider: FulfilmentProviderDto): unknown {
  // Priority: iconSvg from DTO → brand-icons lookup → Umbraco icon fallback
  const svg = provider.iconSvg ?? getFulfilmentProviderIconSvg(provider.key);
  if (svg) {
    return html`<span class="provider-icon-svg">${unsafeHTML(svg)}</span>`;
  }
  return html`<uui-icon name="${provider.icon ?? 'icon-box'}"></uui-icon>`;
}
```

**CSS:**

```css
.provider-icon-svg {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.provider-icon-svg svg {
  width: 100%;
  height: 100%;
}
```

### Provider Card Layout

**Configured Providers (with toggle, test, configure actions):**

```typescript
<div class="provider-card configured" data-provider-id=${config.id}>
  <div class="provider-header">
    <div class="provider-info">
      ${this._renderProviderIcon(provider)}
      <div class="provider-details">
        <span class="provider-name">${config.displayName || provider.displayName}</span>
        <span class="provider-key">${provider.key}</span>
      </div>
    </div>
    <div class="provider-actions">
      <uui-toggle
        .checked=${config.isEnabled}
        @change=${() => this._handleToggle(config)}
        label="Enable provider"
      ></uui-toggle>
      <uui-button compact look="secondary" @click=${() => this._openTestModal(config)}>
        <uui-icon name="icon-lab"></uui-icon>
        Test
      </uui-button>
      <uui-button compact @click=${() => this._openConfigModal(config)}>
        <uui-icon name="icon-settings"></uui-icon>
      </uui-button>
      <uui-button compact color="danger" @click=${() => this._removeProvider(config)}>
        <uui-icon name="icon-trash"></uui-icon>
      </uui-button>
    </div>
  </div>
  <p class="provider-description">${provider.description}</p>
  <div class="provider-footer">
    <div class="provider-features">
      ${provider.supportsWebhooks ? html`<span class="feature-badge">Webhooks</span>` : nothing}
      ${provider.supportsInventorySync ? html`<span class="feature-badge">Inventory Sync</span>` : nothing}
      ${provider.supportsProductSync ? html`<span class="feature-badge">Product Sync</span>` : nothing}
    </div>
    ${provider.setupInstructions
      ? html`<uui-button compact @click=${() => this._showSetupInstructions(provider)}>
          Setup Instructions
        </uui-button>`
      : nothing}
  </div>
</div>
```

**Available Providers (Install button):**

```typescript
<div class="provider-card available">
  <div class="provider-header">
    <div class="provider-info">
      ${this._renderProviderIcon(provider)}
      <div class="provider-details">
        <span class="provider-name">${provider.displayName}</span>
        <span class="provider-key">${provider.key}</span>
      </div>
    </div>
    <uui-button look="primary" @click=${() => this._installProvider(provider)}>
      Install
    </uui-button>
  </div>
  <p class="provider-description">${provider.description}</p>
</div>
```

**Card Styling:**

```css
.provider-card {
  padding: var(--uui-size-space-5);
  border: 1px solid var(--uui-color-border);
  border-radius: var(--uui-border-radius);
  background: var(--uui-color-surface);
}

.provider-card.configured {
  border-left: 3px solid var(--uui-color-positive);
}

.provider-card.available {
  border-left: 3px solid var(--uui-color-border-emphasis);
}

.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--uui-size-space-4);
}

.provider-info {
  display: flex;
  align-items: center;
  gap: var(--uui-size-space-3);
}

.provider-info > uui-icon {
  font-size: 1.5rem;
  color: var(--uui-color-text-alt);
}

.provider-details {
  display: flex;
  flex-direction: column;
}

.provider-name {
  font-weight: 600;
  font-size: 1rem;
}

.provider-key {
  font-size: 0.75rem;
  color: var(--uui-color-text-alt);
}

.provider-actions {
  display: flex;
  align-items: center;
  gap: var(--uui-size-space-2);
}

.provider-description {
  margin: var(--uui-size-space-3) 0;
  color: var(--uui-color-text-alt);
  font-style: italic;
}

.provider-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.provider-features {
  display: flex;
  flex-wrap: wrap;
  gap: var(--uui-size-space-2);
}

.feature-badge {
  display: inline-flex;
  padding: var(--uui-size-space-1) var(--uui-size-space-2);
  font-size: 0.7rem;
  border-radius: var(--uui-border-radius);
  background: var(--uui-color-surface-alt);
  color: var(--uui-color-text);
}
```

### TypeScript DTOs

**fulfilment-providers.types.ts:**

```typescript
export interface FulfilmentProviderDto {
  key: string;
  displayName: string;
  description?: string;
  icon?: string;
  iconSvg?: string;
  setupInstructions?: string;
  supportsOrderSubmission: boolean;
  supportsOrderCancellation: boolean;
  supportsWebhooks: boolean;
  supportsPolling: boolean;
  supportsProductSync: boolean;
  supportsInventorySync: boolean;
  apiStyle: "rest" | "graphql" | "sftp";
  configurationFields: FulfilmentProviderConfigurationFieldDto[];
}

export interface FulfilmentProviderConfigurationFieldDto {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "select" | "checkbox";
  required: boolean;
  defaultValue?: string;
  description?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface FulfilmentProviderConfigurationDto {
  id: string;
  providerKey: string;
  displayName?: string;
  isEnabled: boolean;
  inventorySyncMode: "full" | "delta";
  settings: Record<string, unknown>;
  sortOrder: number;
  createDate: string;
  updateDate: string;
}

export interface FulfilmentProviderConfigurationListItemDto {
  id: string;
  providerKey: string;
  displayName?: string;
  isEnabled: boolean;
  inventorySyncMode: "full" | "delta";
}

export interface CreateFulfilmentProviderConfigurationDto {
  providerKey: string;
  displayName?: string;
  isEnabled: boolean;
  inventorySyncMode: "full" | "delta";
  settings: Record<string, unknown>;
}

export interface UpdateFulfilmentProviderConfigurationDto {
  displayName?: string;
  isEnabled: boolean;
  inventorySyncMode: "full" | "delta";
  settings: Record<string, unknown>;
}
```

### Webhook URL Display

Each configured provider card displays its webhook URL for easy copying:

```typescript
private _renderWebhookUrl(config: FulfilmentProviderConfigurationDto): unknown {
  if (!this._provider?.supportsWebhooks) return nothing;

  const webhookUrl = `${window.location.origin}/umbraco/merchello/webhooks/fulfilment/${config.providerKey}`;

  return html`
    <div class="webhook-url-section">
      <label>Webhook URL</label>
      <div class="webhook-url-row">
        <uui-input readonly .value=${webhookUrl}></uui-input>
        <uui-button compact @click=${() => this._copyToClipboard(webhookUrl)}>
          <uui-icon name="icon-documents"></uui-icon>
        </uui-button>
      </div>
      <small>Configure this URL in your ${this._provider.displayName} dashboard</small>
    </div>
  `;
}
```

### Navigation Helpers

Add to `src/shared/utils/navigation.ts`:

```typescript
export const FULFILMENT_PROVIDER_ENTITY_TYPE = "merchello-fulfilment-provider";

export function getFulfilmentProvidersHref(): string {
  return "section/merchello/workspace/merchello-providers/fulfilment";
}

export function navigateToFulfilmentProviders(): void {
  window.history.pushState({}, "", getFulfilmentProvidersHref());
  window.dispatchEvent(new PopStateEvent("popstate"));
}
```

---

## Admin Test UI

The backoffice includes a **Test Fulfilment Provider Modal** that allows administrators to interactively test provider configurations before going live. This follows the same pattern as the Payment Provider test UI.

### Modal Structure

**Location:** Sidebar modal accessed via **Test button** (lab icon) on each configured provider card.

**Tabs:**

| Tab | Purpose |
|-----|---------|
| **Connection** | Test API connectivity and authentication |
| **Order Submission** | Submit a test order to the 3PL |
| **Webhooks** | Simulate webhook events to test processing |
| **Product Sync** | Test product catalog synchronization |
| **Inventory Sync** | Test inventory level retrieval |

### Webhook URL Display

The provider configuration card displays the webhook URL for easy copying:

**URL Format:** `{BaseUrl}/umbraco/merchello/webhooks/fulfilment/{providerKey}`

**Example:** `https://mystore.com/umbraco/merchello/webhooks/fulfilment/shipbob`

The UI shows:
- Read-only text field with the full URL
- Copy button
- Note: "Configure this URL in your {ProviderDisplayName} dashboard"

### Connection Tab

Tests basic provider connectivity:
- Validates API credentials (API key, PAT, JWT)
- Returns connection status and provider version info
- Shows any configuration errors

```typescript
interface TestConnectionResultDto {
  success: boolean;
  providerVersion?: string;
  accountName?: string;
  warehouseCount?: number;
  errorMessage?: string;
  errorCode?: string;
}
```

### Order Submission Tab

Tests order submission flow with mock data:
- Creates test order with sample line items
- Submits to 3PL sandbox/test environment
- Returns provider reference and status
- Shows full request/response for debugging

```typescript
interface TestOrderSubmissionDto {
  lineItems: TestLineItemDto[];  // Default: 2 sample items
  shippingAddress: TestAddressDto;  // Default: test address
  useRealSandbox: boolean;  // Actually submit to 3PL sandbox
}

interface TestOrderSubmissionResultDto {
  success: boolean;
  providerReference?: string;
  providerStatus?: string;
  requestPayload?: string;  // JSON for debugging
  responsePayload?: string;
  errorMessage?: string;
}
```

### Webhooks Tab

Simulates webhook events to test processing:
- Loads available webhook event templates for the provider
- Supports custom JSON payload for advanced testing
- Skips signature validation in test mode
- Shows detected event type and actions performed

```typescript
interface SimulateFulfilmentWebhookDto {
  eventType: string;  // e.g., "shipment.created", "order.shipped"
  providerReference?: string;
  trackingNumber?: string;
  carrier?: string;
  customPayload?: string;  // For advanced testing
}

interface FulfilmentWebhookSimulationResultDto {
  success: boolean;
  validationSkipped: boolean;
  eventTypeDetected?: string;
  actionsPerformed: string[];  // e.g., ["Created shipment", "Updated order status to Shipped"]
  payload?: string;
  errorMessage?: string;
}
```

**Webhook Event Templates by Provider:**

| Provider | Events |
|----------|--------|
| ShipBob | `order.shipped`, `order.delivered`, `order.cancelled`, `shipment.created` |
| ShipMonk | `order.status_changed`, `shipment.created`, `inventory.updated` |
| ShipHero | `Shipment Update`, `Order Canceled`, `Inventory Update` |

### Product Sync Tab

Tests product catalog synchronization:
- Shows products that would be synced
- Performs dry-run or actual sync to sandbox
- Returns success/failure counts
- Shows any SKU mapping errors

```typescript
interface TestProductSyncResultDto {
  success: boolean;
  productsFound: number;
  productsSynced: number;
  productsFailed: number;
  errors: ProductSyncErrorDto[];
  isDryRun: boolean;
}
```

### Inventory Sync Tab

Tests inventory level retrieval:
- Fetches current stock levels from 3PL
- Shows comparison with Merchello stock
- Highlights discrepancies
- Supports dry-run mode

```typescript
interface TestInventorySyncResultDto {
  success: boolean;
  itemsRetrieved: number;
  discrepancies: InventoryDiscrepancyDto[];
  isDryRun: boolean;
}

interface InventoryDiscrepancyDto {
  sku: string;
  merchelloStock: int;
  providerStock: int;
  difference: int;
}
```

### API Endpoints for Test UI

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/fulfilment-providers/{id}/test/connection` | Test API connectivity |
| POST | `/api/v1/fulfilment-providers/{id}/test/order` | Submit test order |
| GET | `/api/v1/fulfilment-providers/{id}/test/webhook-events` | Get webhook event templates |
| POST | `/api/v1/fulfilment-providers/{id}/test/simulate-webhook` | Simulate webhook processing |
| POST | `/api/v1/fulfilment-providers/{id}/test/product-sync` | Test product sync |
| POST | `/api/v1/fulfilment-providers/{id}/test/inventory-sync` | Test inventory sync |

### Provider Interface Additions

```csharp
public interface IFulfilmentProvider
{
    // ... existing methods ...

    // Test UI support
    Task<IReadOnlyList<WebhookEventTemplate>> GetWebhookEventTemplatesAsync(CancellationToken ct = default);
    Task<string?> GenerateTestWebhookPayloadAsync(string eventType, FulfilmentTestWebhookContext context, CancellationToken ct = default);
}

public record WebhookEventTemplate
{
    public required string EventType { get; init; }
    public required string DisplayName { get; init; }
    public string? Description { get; init; }
    public WebhookEventCategory Category { get; init; }  // Shipment, Order, Inventory, Other
}

public record FulfilmentTestWebhookContext
{
    public string? ProviderReference { get; init; }
    public string? TrackingNumber { get; init; }
    public string? Carrier { get; init; }
    public decimal? Amount { get; init; }
}
```

### Frontend Components

> See [Backoffice UI Architecture](#backoffice-ui-architecture) for the complete frontend structure, manifest patterns, and component details.

**Test-specific files:**

```
src/Merchello/Client/src/fulfilment-providers/
├── manifest.ts                              # Includes test modal registration
├── modals/
│   ├── test-provider-modal.element.ts       # Main test modal (tabbed interface)
│   └── test-provider-modal.token.ts         # Modal token and types
├── components/
│   └── fulfilment-providers-list.element.ts # Provider list with Test button
└── types/
    └── fulfilment-providers.types.ts        # Includes test UI DTOs
```

### State Persistence

Test UI persists user preferences in localStorage:
- Active tab selection
- Test order line items
- Last used webhook event type

Storage key: `"merchello-test-fulfilment-provider-form"`

---

## Integration Tests

Following the established payment provider test patterns, fulfilment providers require comprehensive integration tests.

### Test File Structure

```
src/Merchello.Tests/Fulfilment/
├── Models/
│   ├── FulfilmentProviderConfigurationTests.cs
│   └── FulfilmentSyncLogTests.cs
├── Providers/
│   ├── FulfilmentProviderBaseTests.cs
│   └── TestFulfilmentProvider.cs           # Test helper
├── Services/
│   ├── FulfilmentServiceTests.cs
│   └── FulfilmentSyncServiceTests.cs
└── FulfilmentStatusMappingTests.cs
```

### Test Frameworks

| Framework | Purpose |
|-----------|---------|
| **xUnit** | Test framework (`[Fact]`, `[Theory]`) |
| **Shouldly** | Assertions (`result.ShouldBe(expected)`) |
| **Moq** | Mocking dependencies |
| **ServiceTestFixture** | DI container with in-memory database |

### Required Test Coverage

#### FulfilmentProviderConfigurationTests

```csharp
public class FulfilmentProviderConfigurationTests
{
    [Fact]
    public void GetSetting_ExistingKey_ReturnsValue_CaseInsensitive()
    {
        var json = """{"apiKey": "secret123", "channelId": "12345"}""";
        var config = new FulfilmentProviderConfiguration { SettingsJson = json };

        config.GetSetting("apiKey").ShouldBe("secret123");
        config.GetSetting("APIKEY").ShouldBe("secret123");
    }

    [Fact]
    public void Constructor_InvalidJson_ReturnsEmptySettings()
    {
        var config = new FulfilmentProviderConfiguration { SettingsJson = "{ invalid }" };
        config.GetSetting("anyKey").ShouldBeNull();
    }
}
```

#### FulfilmentProviderBaseTests

```csharp
public class FulfilmentProviderBaseTests
{
    [Fact]
    public async Task CancelOrderAsync_DefaultImplementation_ReturnsNotSupported()
    {
        var provider = new TestFulfilmentProvider();

        var result = await provider.CancelOrderAsync("ref-123");

        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldContain("does not support cancellation");
    }

    [Fact]
    public async Task SyncProductsAsync_DefaultImplementation_ReturnsNotSupported()
    {
        var provider = new TestFulfilmentProvider();

        var result = await provider.SyncProductsAsync([]);

        result.Success.ShouldBeFalse();
    }

    [Fact]
    public async Task ValidateWebhookAsync_DefaultImplementation_ReturnsFalse()
    {
        var provider = new TestFulfilmentProvider();
        var request = new Mock<HttpRequest>();

        var result = await provider.ValidateWebhookAsync(request.Object);

        result.ShouldBeFalse();
    }
}
```

#### FulfilmentServiceTests

```csharp
[Collection("Integration Tests")]
public class FulfilmentServiceTests
{
    private readonly ServiceTestFixture _fixture;

    [Fact]
    public async Task SubmitOrderAsync_ProviderNotConfigured_ReturnsError()
    {
        var order = await CreateTestOrder(warehouseWithProvider: false);

        var result = await _fulfilmentService.SubmitOrderAsync(order.Id);

        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message.Contains("No fulfilment provider configured"));
    }

    [Fact]
    public async Task SubmitOrderAsync_ProviderDisabled_ReturnsError()
    {
        var config = await CreateProviderConfig(isEnabled: false);
        var order = await CreateTestOrder(providerConfigId: config.Id);

        var result = await _fulfilmentService.SubmitOrderAsync(order.Id);

        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message.Contains("Provider is disabled"));
    }

    [Fact]
    public async Task SubmitOrderAsync_Success_SetsProviderReference()
    {
        var config = await CreateProviderConfig(isEnabled: true);
        var order = await CreateTestOrder(providerConfigId: config.Id);

        var result = await _fulfilmentService.SubmitOrderAsync(order.Id);

        result.Success.ShouldBeTrue();
        result.ResultObject!.FulfilmentProviderReference.ShouldNotBeNullOrEmpty();
        result.ResultObject.FulfilmentSubmittedAt.ShouldNotBeNull();
    }

    [Fact]
    public async Task SubmitOrderAsync_ProviderFailure_IncrementsRetryCount()
    {
        var config = await CreateProviderConfig(simulateFailure: true);
        var order = await CreateTestOrder(providerConfigId: config.Id);

        var result = await _fulfilmentService.SubmitOrderAsync(order.Id);

        result.Success.ShouldBeFalse();
        var updated = await GetOrder(order.Id);
        updated.FulfilmentRetryCount.ShouldBe(1);
        updated.FulfilmentErrorMessage.ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task ResolveProviderForWarehouseAsync_WarehouseOverride_ReturnsWarehouseProvider()
    {
        var supplierConfig = await CreateProviderConfig(key: "supplier-provider");
        var warehouseConfig = await CreateProviderConfig(key: "warehouse-provider");
        var warehouse = await CreateWarehouse(
            supplierDefaultConfigId: supplierConfig.Id,
            warehouseConfigId: warehouseConfig.Id);

        var result = await _fulfilmentService.ResolveProviderForWarehouseAsync(warehouse.Id);

        result.ShouldNotBeNull();
        result!.Id.ShouldBe(warehouseConfig.Id);
    }

    [Fact]
    public async Task ResolveProviderForWarehouseAsync_NoWarehouseOverride_ReturnsSupplierDefault()
    {
        var supplierConfig = await CreateProviderConfig(key: "supplier-provider");
        var warehouse = await CreateWarehouse(
            supplierDefaultConfigId: supplierConfig.Id,
            warehouseConfigId: null);

        var result = await _fulfilmentService.ResolveProviderForWarehouseAsync(warehouse.Id);

        result.ShouldNotBeNull();
        result!.Id.ShouldBe(supplierConfig.Id);
    }
}
```

#### FulfilmentSyncServiceTests

```csharp
[Collection("Integration Tests")]
public class FulfilmentSyncServiceTests
{
    [Fact]
    public async Task SyncInventoryAsync_FullMode_OverwritesStock()
    {
        var config = await CreateProviderConfig(inventorySyncMode: InventorySyncMode.Full);
        await SetProductStock("SKU-001", currentStock: 100);
        MockProviderInventory("SKU-001", providerStock: 50);

        var result = await _syncService.SyncInventoryAsync(config.Id);

        result.Status.ShouldBe(FulfilmentSyncStatus.Completed);
        var stock = await GetProductStock("SKU-001");
        stock.ShouldBe(50);
    }

    [Fact]
    public async Task SyncInventoryAsync_DeltaMode_AppliesAdjustments()
    {
        var config = await CreateProviderConfig(inventorySyncMode: InventorySyncMode.Delta);
        await SetProductStock("SKU-001", currentStock: 100);
        MockProviderInventoryDelta("SKU-001", adjustment: -10);

        var result = await _syncService.SyncInventoryAsync(config.Id);

        result.Status.ShouldBe(FulfilmentSyncStatus.Completed);
        var stock = await GetProductStock("SKU-001");
        stock.ShouldBe(90);
    }

    [Fact]
    public async Task SyncProductsAsync_CreatesLogEntry()
    {
        var config = await CreateProviderConfig();
        var products = await CreateTestProducts(count: 5);

        var result = await _syncService.SyncProductsAsync(config.Id);

        result.ShouldNotBeNull();
        result.SyncType.ShouldBe(FulfilmentSyncType.ProductsOut);
        result.ItemsProcessed.ShouldBe(5);
    }
}
```

#### FulfilmentStatusMappingTests

```csharp
public class FulfilmentStatusMappingTests
{
    [Theory]
    [InlineData("Processing", OrderStatus.Processing)]
    [InlineData("Shipped", OrderStatus.Shipped)]
    [InlineData("Delivered", OrderStatus.Completed)]
    [InlineData("On Hold", OrderStatus.OnHold)]
    [InlineData("Cancelled", OrderStatus.Cancelled)]
    public void MapShipBobStatus_ReturnsCorrectOrderStatus(string shipBobStatus, OrderStatus expected)
    {
        var result = ShipBobStatusMapper.ToOrderStatus(shipBobStatus);
        result.ShouldBe(expected);
    }

    [Theory]
    [InlineData("Submitted", OrderStatus.Processing)]
    [InlineData("Pick in progress", OrderStatus.Processing)]
    [InlineData("En route", OrderStatus.Shipped)]
    [InlineData("Delivered", OrderStatus.Completed)]
    public void MapShipMonkStatus_ReturnsCorrectOrderStatus(string shipMonkStatus, OrderStatus expected)
    {
        var result = ShipMonkStatusMapper.ToOrderStatus(shipMonkStatus);
        result.ShouldBe(expected);
    }
}
```

### Test Helper Classes

#### TestFulfilmentProvider

```csharp
/// <summary>
/// Minimal implementation for testing FulfilmentProviderBase defaults.
/// </summary>
public class TestFulfilmentProvider : FulfilmentProviderBase
{
    public bool SimulateFailure { get; set; }
    public string? LastSubmittedOrderId { get; private set; }

    public override FulfilmentProviderMetadata Metadata => new()
    {
        Key = "test",
        DisplayName = "Test Fulfilment Provider",
        SupportsOrderSubmission = true,
        SupportsOrderCancellation = false,
        SupportsWebhooks = false,
        SupportsPolling = false,
        SupportsProductSync = false,
        SupportsInventorySync = false
    };

    public override Task<FulfilmentOrderResult> SubmitOrderAsync(
        FulfilmentOrderRequest request, CancellationToken ct = default)
    {
        if (SimulateFailure)
        {
            return Task.FromResult(FulfilmentOrderResult.Failed("Simulated failure"));
        }

        LastSubmittedOrderId = request.OrderId.ToString();
        return Task.FromResult(FulfilmentOrderResult.Succeeded($"TEST-{request.OrderId:N}"));
    }
}
```

### Test Isolation

Tests use xUnit collection definitions to prevent parallel execution interference:

```csharp
[CollectionDefinition("Integration Tests", DisableParallelization = true)]
public class IntegrationTestCollection : ICollectionFixture<ServiceTestFixture>
{
}
```

### Provider Tests (Optional)

When providers are implemented, their tests go under `src/Merchello.Tests/Fulfilment/Providers/`:

```
src/Merchello.Tests/Fulfilment/Providers/
├── ShipBob/
│   ├── ShipBobFulfilmentProviderTests.cs
│   ├── ShipBobApiClientTests.cs
│   └── ShipBobStatusMapperTests.cs
├── ShipMonk/
│   └── ...
└── ShipHero/
    └── ...
```

---

## ShipBob Reference

### Status Mapping

| ShipBob Status | → OrderStatus |
|----------------|---------------|
| Processing (Picked/Packed/Labeled) | Processing |
| Completed (InTransit/OutForDelivery) | Shipped |
| Completed (Delivered) | Completed |
| Completed (DeliveryException) | OnHold |
| On Hold | OnHold |
| Exception | OnHold |
| Cancelled | Cancelled |

### Webhook Headers

```
x-webhook-topic: order.shipped
webhook-timestamp: 1755884852
webhook-signature: v1,<signature>
webhook-id: msg_xxx
```

### Key Endpoints

| Operation | Endpoint |
|-----------|----------|
| Create order | `POST /2025-07/order` |
| Cancel order | `POST /2025-07/order/{id}:cancel` |
| Get shipments | `GET /2025-07/order/{id}/shipment` |
| Create product | `POST /2025-07/product` |
| List inventory | `GET /2025-07/inventory` |
| List inventory (fast) | `GET /2025-07/inventory-levels` |

> **Note:** ShipBob uses `:action` suffix notation for some endpoints (e.g., `order/{id}:cancel`).

---

## ShipMonk Reference

### Status Mapping

| ShipMonk Status | → OrderStatus |
|-----------------|---------------|
| Submitted | Processing |
| Pick in progress | Processing |
| Pack in progress | Processing |
| Packed | Processing |
| Awaiting pickup | Processing |
| Awaiting carrier processing | Processing |
| En route | Shipped |
| Delivered | Completed |
| On hold | OnHold |
| Back-order | OnHold |
| Unable to submit | OnHold |
| Undeliverable | OnHold |
| Cancellation requested | Cancelled |
| Cancelled | Cancelled |

### Webhook Configuration

ShipMonk webhooks use HTTP Basic Authentication and include an `X-Sm-Signature` header for HMAC-SHA512 signature validation.

```
X-Sm-Signature: <hmac-sha512-signature>
Content-Type: application/json
```

**Retry Policy:** Up to 100 retries with 5-minute intervals between attempts.

### Key Endpoints

| Operation | Endpoint |
|-----------|----------|
| Create/update order | `POST /v1/integrations/order` |
| Get order | `GET /v1/integrations/orders` |
| List orders | `GET /v1/integrations/orders-list` |
| Submit order | `POST /v1/integrations/submit-order` |
| Create product | `POST /v1/integrations/product` |
| List products | `GET /v1/products` |
| List warehouses | `GET /v1/integrations/warehouses` |

> **Note:** ShipMonk order cancellation is performed by setting `orderStatus: "cancelled"` on the order update endpoint.

---

## ShipHero Reference

### API Style: GraphQL

ShipHero uses GraphQL instead of REST. All data operations go through `https://public-api.shiphero.com/graphql`.

### Authentication

ShipHero uses JWT tokens that expire every 28 days:

1. POST credentials to `/auth/token` to get `access_token` and `refresh_token`
2. Include `Authorization: Bearer <access_token>` on all GraphQL requests
3. Use `refresh_token` to get new tokens before expiry

### Rate Limiting

- **Credits:** 4,004 initial credits shared across all users
- **Restore rate:** 60 credits per second
- **Max per operation:** 4,004 credits
- **Request limit:** 7,000 requests per 5 minutes

### Status Mapping

| ShipHero Status | → OrderStatus |
|-----------------|---------------|
| pending | Pending |
| processing | Processing |
| partially_shipped | PartiallyShipped |
| fulfilled | Shipped |
| delivered | Completed |
| canceled | Cancelled |
| on_hold | OnHold |

### Webhook Headers

```
X-Shiphero-Message-ID: <unique-message-id>
Content-Type: application/json
```

> **Note:** ShipHero webhooks use `X-Shiphero-Message-ID` for message identification and deduplication. No HMAC signature - rely on message ID for idempotency.

### Webhook Types

| Webhook | Purpose |
|---------|---------|
| `Shipment Update` | Order fulfilled/shipped |
| `Order Canceled` | Order cancellation |
| `Inventory Update` | Stock level changes |
| `Inventory Change` | Stock adjustments with reason |
| `Package Added` | New package created |
| `Order Allocated` | Inventory allocated to order |
| `Order Deallocated` | Inventory released |

### Key GraphQL Operations

**Mutations:**

| Operation | Mutation |
|-----------|----------|
| Create order | `order_create(data: CreateOrderInput!)` |
| Cancel order | `order_cancel(data: { order_id, reason })` |
| Update fulfillment | `order_update_fulfillment_status(data: ...)` |
| Create product | `product_create(data: CreateProductInput!)` |
| Update product | `product_update(data: UpdateProductInput!)` |
| Add inventory | `inventory_add(data: UpdateInventoryInput!)` |
| Remove inventory | `inventory_remove(data: UpdateInventoryInput!)` |
| Sync inventory (bulk) | `inventory_sync(data: InventorySyncInput!)` |
| Create shipment | `shipment_create(data: CreateShipmentInput!)` |

**Queries:**

| Operation | Query |
|-----------|-------|
| Get orders | `orders(...)` |
| Get products | `products(...)` |
| Get inventory | `warehouse_products(...)` |

### ShipHero Fulfillment Flow

ShipHero requires a 3-step process when fulfilling orders via API:

1. **Create shipment** - `shipment_create` with label and line items
2. **Remove inventory** - `inventory_remove` to deduct stock
3. **Update status** - `order_update_fulfillment_status` to mark fulfilled

> **Important:** For 3PL-Child account relationships, shipments must be created at the 3PL level without using `customer_account_id`.

---

## Provider Implementation Considerations

### Authentication Differences

| Provider | Auth Type | Token Expiry | Handling |
|----------|-----------|--------------|----------|
| ShipBob | PAT (Personal Access Token) | Never expires | Store securely, use as Bearer |
| ShipMonk | API Key | Never expires | Pass in `Api-Key` header |
| ShipHero | JWT | 28 days | Auto-refresh using refresh token |
| Helm WMS | SFTP credentials | N/A | SSH key or password |

### Webhook Idempotency

All providers should implement idempotency to prevent duplicate processing:

- **ShipBob**: Use `webhook-id` header as idempotency key
- **ShipMonk**: Use combination of order ID + status + timestamp
- **ShipHero**: Use `X-Shiphero-Message-ID` header

#### Webhook Log Storage

Use a dedicated table for webhook deduplication:

**merchelloFulfilmentWebhookLogs:**

| Column | Type | Description |
|--------|------|-------------|
| Id | UNIQUEIDENTIFIER | Primary key |
| ProviderConfigurationId | UNIQUEIDENTIFIER | FK to provider config |
| MessageId | NVARCHAR(256) | Provider's webhook ID (indexed) |
| EventType | NVARCHAR(100) | e.g., "shipment.created" |
| ProcessedAt | DATETIME2 | When processed |
| ExpiresAt | DATETIME2 | TTL for cleanup |

**Retention:** 7 days (configurable via `Merchello:Fulfilment:WebhookLogRetentionDays`)

**Cleanup:** `FulfilmentCleanupJob` runs daily, deletes expired records.

### Rate Limiting

| Provider | Limit | Strategy |
|----------|-------|----------|
| ShipBob | Standard REST limits | Exponential backoff on 429 |
| ShipMonk | Standard REST limits | Exponential backoff on 429 |
| ShipHero | 4,004 credits / 60 per second | Track credits, queue requests |

### Error Handling

Common error scenarios to handle:

1. **Connection timeout** - Retry with backoff
2. **Invalid credentials** - Mark provider as unhealthy, notify admin
3. **Order not found at 3PL** - May have been cancelled externally
4. **SKU not found** - Product sync may be needed
5. **Rate limited** - Queue and retry with backoff
6. **Webhook signature invalid** - Log and reject (possible tampering)

### Testing in Sandbox

| Provider | Sandbox URL | Notes |
|----------|-------------|-------|
| ShipBob | `https://sandbox-api.shipbob.com` | Supports shipment simulation |
| ShipMonk | Same API with sandbox flag | Contact ShipMonk for sandbox access |
| ShipHero | No separate sandbox | Use test orders with specific prefixes |

---

## Testing Checklist

### Phase 1
- [x] Provider discovery works
- [x] Provider config CRUD works
- [x] Warehouse/Supplier resolution works
- [x] Order has fulfilment fields
- [x] Shipment has tracking fields

### Phase 2
- [x] Order auto-submits on creation (when provider configured)
- [x] Order.FulfilmentProviderReference populated
- [x] Order.Status transitions correctly
- [x] Webhook creates Shipment with tracking
- [x] Retry logic works
- [x] FulfilmentFailed status set after max retries

### Phase 3
- [x] ShipmentCreatedNotification fires
- [x] StockAllocatedNotification fires
- [x] Outbound webhooks work

### Phase 4
- [x] Product sync works
- [x] Inventory sync (Full) overwrites stock
- [x] Inventory sync (Delta) adjusts stock
- [x] Sync logs created

### Phase 5
- [x] Provider configuration workspace renders
- [x] Supplier UI shows fulfilment provider dropdown
- [x] Warehouse UI shows optional override dropdown
- [x] Sync logs viewer displays history

### Phase 6
- [x] All integration tests pass

### Optional Provider Tests

Each provider package includes its own test suite:

**ShipBob:**
- [ ] API client connects with PAT
- [ ] Order submission creates order in ShipBob
- [ ] Webhook signature validation works
- [ ] Status mapping correct for all ShipBob statuses
- [ ] Product sync creates/updates products
- [ ] Inventory levels retrieved correctly

**ShipMonk:**
- [ ] API client connects with API Key
- [ ] Order submission creates order in ShipMonk
- [ ] HMAC-SHA512 webhook validation works
- [ ] Status mapping correct for all 18 ShipMonk statuses
- [ ] Product sync works
- [ ] Inventory sync works

**ShipHero:**
- [ ] GraphQL client connects with JWT
- [ ] Token auto-refresh before expiry
- [ ] Credit-based rate limiting respected
- [ ] order_create mutation works
- [ ] order_cancel mutation works
- [ ] Webhook message ID deduplication works
- [ ] Status mapping correct
- [ ] 3-step fulfillment flow works (shipment → inventory → status)
- [ ] Product mutations work
- [ ] Inventory queries work

---

## Appendix: Existing Components Reference

### ShipmentStatus Enum (Already Exists)

The fulfilment system leverages the existing `ShipmentStatus` enum:

```csharp
public enum ShipmentStatus
{
    Preparing = 0,    // Shipment created, warehouse preparing
    Shipped = 10,     // Handed to carrier
    Delivered = 20,   // Delivered to customer
    Cancelled = 30    // Shipment cancelled
}
```

When processing 3PL webhook updates:
- Create shipment with `Status = Preparing` or `Shipped` depending on 3PL status
- Use `ShipmentStatusChangedNotification` when status transitions

### Verified Existing Components

These components already exist and will be leveraged:

| Component | Location | Notes |
|-----------|----------|-------|
| `Shipment.TrackingNumber` | Shipping/Models/Shipment.cs | Already exists |
| `Shipment.TrackingUrl` | Shipping/Models/Shipment.cs | Already exists |
| `Shipment.Carrier` | Shipping/Models/Shipment.cs | Already exists (not "CarrierName") |
| `CreateShipmentParameters` | Shipping/Services/Parameters/ | Already has Carrier, TrackingNumber, TrackingUrl |
| `ShipmentCreatedNotification` | Notifications/Shipment/ | Fires when shipment created |
| `ShipmentStatusChangedNotification` | Notifications/Shipment/ | Fires on status change |
| `OrderCreatedNotification` | Notifications/Order/ | Trigger for auto-submission |
| `OrderStatusChangedNotification` | Notifications/Order/ | Fires on order status change |
| `StockAllocatedNotification` | Notifications/Inventory/ | Fires when stock allocated |
| `LowStockNotification` | Notifications/Inventory/ | Fires when stock below threshold |
| `ExtensionManager` | Shared/Reflection/ | For provider discovery |
| `ShippingProviderBase` | Shipping/Providers/ | Pattern to follow |
| `IShippingProviderManager` | Shipping/Providers/Interfaces/ | Pattern to follow |

### Database Table Naming Convention

All Merchello tables use `merchello{TableNameInCamelCase}`:
- `merchelloOrders`
- `merchelloShipments`
- `merchelloWarehouses`
- `merchelloSuppliers`
- `merchelloShippingProviderConfigurations` (reference for new tables)

### FulfilmentProviderConfiguration Model

```csharp
/// <summary>
/// Stores persisted settings for a fulfilment provider implementation.
/// Pattern follows ShippingProviderConfiguration.
/// </summary>
public class FulfilmentProviderConfiguration
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public string ProviderKey { get; set; } = null!;
    public string? DisplayName { get; set; }
    public bool IsEnabled { get; set; }
    public InventorySyncMode InventorySyncMode { get; set; }
    public string? SettingsJson { get; set; }
    public int SortOrder { get; set; }
    public DateTime UpdateDate { get; set; } = DateTime.UtcNow;
    public DateTime CreateDate { get; set; } = DateTime.UtcNow;
}
```

### FulfilmentProviderBase Pattern

```csharp
/// <summary>
/// Base class for fulfilment providers with default implementations.
/// Pattern follows ShippingProviderBase.
/// </summary>
public abstract class FulfilmentProviderBase : IFulfilmentProvider
{
    protected FulfilmentProviderConfiguration? Configuration { get; private set; }

    public abstract FulfilmentProviderMetadata Metadata { get; }

    public virtual ValueTask<IEnumerable<FulfilmentProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult(Enumerable.Empty<FulfilmentProviderConfigurationField>());
    }

    public virtual ValueTask ConfigureAsync(FulfilmentProviderConfiguration? configuration,
        CancellationToken ct = default)
    {
        Configuration = configuration;
        return ValueTask.CompletedTask;
    }

    // Abstract methods for providers to implement
    public abstract Task<FulfilmentOrderResult> SubmitOrderAsync(
        FulfilmentOrderRequest request, CancellationToken ct = default);

    // Default implementations for optional capabilities
    public virtual Task<FulfilmentCancelResult> CancelOrderAsync(
        string providerReference, CancellationToken ct = default)
    {
        return Task.FromResult(FulfilmentCancelResult.NotSupported());
    }

    public virtual Task<bool> ValidateWebhookAsync(HttpRequest request, CancellationToken ct = default)
    {
        return Task.FromResult(false);
    }

    public virtual Task<FulfilmentWebhookResult> ProcessWebhookAsync(HttpRequest request, CancellationToken ct = default)
    {
        return Task.FromResult(FulfilmentWebhookResult.NotSupported());
    }

    public virtual Task<IReadOnlyList<FulfilmentStatusUpdate>> PollOrderStatusAsync(
        IEnumerable<string> providerReferences, CancellationToken ct = default)
    {
        return Task.FromResult<IReadOnlyList<FulfilmentStatusUpdate>>([]);
    }

    public virtual Task<FulfilmentSyncResult> SyncProductsAsync(
        IEnumerable<FulfilmentProduct> products, CancellationToken ct = default)
    {
        return Task.FromResult(FulfilmentSyncResult.NotSupported());
    }

    public virtual Task<IReadOnlyList<FulfilmentInventoryLevel>> GetInventoryLevelsAsync(
        CancellationToken ct = default)
    {
        return Task.FromResult<IReadOnlyList<FulfilmentInventoryLevel>>([]);
    }

    public virtual Task<FulfilmentConnectionTestResult> TestConnectionAsync(CancellationToken ct = default)
    {
        return Task.FromResult(FulfilmentConnectionTestResult.NotSupported());
    }
}
```
