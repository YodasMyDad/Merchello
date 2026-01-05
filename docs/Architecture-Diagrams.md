# Merchello Architecture

Opinionated enterprise ecommerce plugin for Umbraco v17+, which will be installed via Nuget (Merchello.Site will use the Nuget package when complete) **Ethos: making enterprise ecommerce simple.**

## Design Principles
- **Modular** - `ExtensionManager` for pluggable providers (Shipping, Payment, Tax, OrderGrouping)
- **Services** - Feature-grouped, DI, parameter models
- **Factories** - All domain objects via factories
- **Multi-warehouse** - Variant-level stock with priority-based selection

## 1. Architecture Layers

```
CONTROLLERS → Thin: HTTP only, no logic, no DbContext
     ↓
SERVICES → All business logic, all DB access, CrudResult<T>, RORO pattern
     ↓
FACTORIES → All object creation, stateless singletons
```

### Centralized Logic (NEVER duplicate elsewhere)

#### Line Items & Calculations
| Operation | Service.Method |
|-----------|----------------|
| Basket/Invoice totals | `ILineItemService.CalculateFromLineItems()` |
| Discount line items | `ILineItemService.AddDiscountLineItem()` |

#### Products
| Operation | Service.Method |
|-----------|----------------|
| Variant generation | `IProductService.RegenerateVariants()` |
| Stock status | Backend calculates `StockStatus` (InStock/LowStock/OutOfStock/Untracked) - frontend uses DTO property |
| Addon price preview | `IProductService.PreviewAddonPriceAsync()` |

#### Inventory
| Operation | Service.Method |
|-----------|----------------|
| Stock reserve/allocate/release | `IInventoryService.*Async()` |
| Stock adjustment | `IWarehouseService.AdjustStockAsync()` |
| Stock transfer | `IWarehouseService.TransferStockAsync()` |

#### Shipping & Fulfillment
| Operation | Service.Method |
|-----------|----------------|
| Shipping quotes | `IShippingQuoteService.GetQuotesAsync()` |
| Shipping for basket | `IShippingService.GetShippingOptionsForBasket()` |
| Required warehouses | `IShippingService.GetRequiredWarehouses()` |
| Shipping for warehouse | `IShippingService.GetShippingOptionsForWarehouseAsync()` |
| Product fulfillment options | `IShippingService.GetFulfillmentOptionsForProductAsync()` |
| Default fulfilling warehouse | `IShippingService.GetDefaultFulfillingWarehouseAsync()` |
| Shipping for product | `IShippingService.GetShippingOptionsForProductAsync()` |

#### Locality & Regions
| Operation | Service.Method |
|-----------|----------------|
| Available countries | `ILocationsService.GetAvailableCountriesAsync()` |
| Available regions | `ILocationsService.GetAvailableRegionsAsync()` |
| Countries for warehouse | `ILocationsService.GetAvailableCountriesForWarehouseAsync()` |
| Regions for warehouse | `ILocationsService.GetAvailableRegionsForWarehouseAsync()` |

**Locality Data Source**: Country/province data is generated from [country-region-data](https://github.com/country-regions/country-region-data) and stored in `LocalityData.cs`.

To regenerate: `node scripts/generate-locality-data.js`

| Aspect | Details |
|--------|---------|
| Countries | 249 (from .NET CultureInfo + Crown Dependencies: JE, GG, IM) |
| Subdivisions | 624 entries across 30 countries |
| UK | ENG, SCT, WLS, NIR, BFP (British Forces) |
| US | 50 states + DC + territories + military postal codes |
| Code format | Internal: suffix-only (`ENG`, `CA`); Display: ISO 3166-2 (`GB-ENG`, `US-CA`) |

#### Checkout
| Operation | Service.Method |
|-----------|----------------|
| Calculate basket | `ICheckoutService.CalculateBasketAsync()` |
| Apply discount code | `ICheckoutService.ApplyDiscountCodeAsync()` |
| Refresh auto discounts | `ICheckoutService.RefreshAutomaticDiscountsAsync()` |

#### Invoice & Order
| Operation | Service.Method |
|-----------|----------------|
| Invoice recalc | `IInvoiceService.RecalculateInvoiceTotals()` |
| Order creation | `IInvoiceService.CreateOrderFromBasketAsync()` |
| Preview invoice edit | `IInvoiceService.PreviewInvoiceEditAsync()` |
| Edit invoice | `IInvoiceService.EditInvoiceAsync()` |
| Create draft order | `IInvoiceService.CreateDraftOrderAsync()` |
| Cancel invoice | `IInvoiceService.CancelInvoiceAsync()` |

#### Customer & Segments
| Operation | Service.Method |
|-----------|----------------|
| Customer get/create | `ICustomerService.GetOrCreateByEmailAsync()` |
| Segment membership | `ICustomerSegmentService.IsCustomerInSegmentAsync()` |

#### Discounts
| Operation | Service.Method |
|-----------|----------------|
| Discount calculation | `IDiscountEngine.CalculateAsync()` |
| Discount validation | `IDiscountEngine.ValidateCodeAsync()` |
| Discount application | `IDiscountEngine.ApplyDiscountsAsync()` |
| Discount usage | `IDiscountService.RecordUsageAsync()` |
| BOGO calculation | `IBuyXGetYCalculator.Calculate()` |
| Preview line item discount | `IInvoiceService.PreviewDiscountAsync()` |

#### Payment
| Operation | Service.Method |
|-----------|----------------|
| Payment status | `IPaymentService.CalculatePaymentStatus()` |
| Risk level | Backend calculates `RiskLevel` (high/medium/low/minimal) - frontend uses DTO property |
| Create payment session | `IPaymentService.CreatePaymentSessionAsync()` |
| Process payment | `IPaymentService.ProcessPaymentAsync()` |
| Record payment | `IPaymentService.RecordPaymentAsync()` |
| Process refund | `IPaymentService.ProcessRefundAsync()` |
| Record manual payment | `IPaymentService.RecordManualPaymentAsync()` |

#### Tax
| Operation | Service.Method |
|-----------|----------------|
| Tax groups | `ITaxService.GetTaxGroups()` |
| Tax rates (geographic) | `ITaxService.GetApplicableRateAsync()` |
| Tax calculation | `ITaxProviderManager.GetActiveProviderAsync()` → `ITaxProvider.CalculateTaxAsync()` |
| Tax preview (custom items) | `ITaxService` via `TaxApiController.PreviewCustomItemTax()` |

#### Currency
| Operation | Service.Method |
|-----------|----------------|
| Currency rounding | `ICurrencyService.Round()` |
| To minor units | `ICurrencyService.ToMinorUnits()` |
| From minor units | `ICurrencyService.FromMinorUnits()` |
| Exchange rate | `IExchangeRateCache.GetRateAsync()` |

#### Reporting & Analytics
| Operation | Service.Method |
|-----------|----------------|
| Sales breakdown | `IReportingService.GetSalesBreakdownAsync()` - includes TotalCost, GrossProfit, GrossProfitMargin |
| Best sellers | `IReportingService.GetBestSellersAsync()` |

**Cost Tracking**: `LineItem.Cost` is captured at order creation time for historical profit accuracy. Add-on costs are extracted from `ExtendedData["CostAdjustment"]`.

### Factories

| Factory | Creates |
|---------|---------|
| `InvoiceFactory` | Invoice from basket/draft |
| `OrderFactory` | Order for invoice |
| `PaymentFactory` | Payment/refund records |
| `ShipmentFactory` | Shipment for order |
| `BasketFactory` | Shopping basket |
| `ProductFactory` | Product variants |
| `ProductRootFactory` | ProductRoot with options |
| `ProductOptionFactory` | Options and values |
| `LineItemFactory` | Line items |
| `TaxGroupFactory` | Tax config |
| `CustomerFactory` | Customer from email/params |
| `CustomerSegmentFactory` | CustomerSegment, CustomerSegmentMember |
| `DiscountFactory` | Discount, TargetRules, BuyXGetYConfig, FreeShippingConfig |

### Rules
```csharp
// ❌ Logic in controller / direct DbContext
var paid = payments.Where(p => p.PaymentSuccess).Sum(p => p.Amount);

// ✅ Delegate to service
var status = await paymentService.CalculatePaymentStatusAsync(invoiceId);

// ❌ Direct instantiation
var invoice = new Invoice { Id = Guid.NewGuid() };

// ✅ Use factory
var invoice = invoiceFactory.CreateFromBasket(basket, invoiceNumber, billingAddress);
```

### Benefits
1. Financial accuracy - single source of truth
2. Auditability - traceable calculations
3. Maintainability - change once, applies everywhere
4. Testing - isolated unit tests
5. Thread safety - stateless factories, scoped DbContext

## 2. Folder Structure

```
Feature/
├── Models/          # Domain models
├── Factories/       # Object instantiation
├── Services/        # Business logic
│   ├── Interfaces/
│   └── Parameters/  # RORO objects
├── Mapping/         # Custom mapping
├── Dtos/
└── ExtensionMethods/
```

**Modules**: Accounting, Checkout, Customers, Discounts, Products, Shipping, Payments, Suppliers, Warehouses, Locality, Notifications, Stores, Webhooks

## 3. Entity Relationships

```
Supplier →1:N→ Warehouse →1:N→ ServiceRegions
                       →1:N→ ShippingOptions →1:N→ ShippingCosts
                       →M:N→ ProductRoot (via ProductRootWarehouse)
                       →M:N→ Product (via ProductWarehouse: Stock, ReservedStock, TrackStock)

ProductRoot →1:N→ Product (variant)
           →1:N→ DefaultPackageConfigurations

Product →1:N→ PackageConfigurations, HsCode

Customer →1:N→ Invoice (required, auto-created from billing email)
        →M:N→ CustomerSegment (via CustomerSegmentMember for manual, criteria evaluation for automated)

CustomerSegment →1:N→ CustomerSegmentMember (manual segments only)

Discount →1:N→ DiscountTargetRule
        →1:N→ DiscountEligibilityRule
        →1:N→ DiscountUsage
        →1:1→ DiscountBuyXGetYConfig (optional, for BuyXGetY category)
        →1:1→ DiscountFreeShippingConfig (optional, for FreeShipping category)

Invoice →1:N→ Order →1:N→ Shipment (N:1 Warehouse)
       →1:N→ Payment

Order →1:N→ LineItems

WebhookSubscription →1:N→ WebhookDelivery (cascade delete)
```

## 4. Provider Systems

`ExtensionManager` scans assemblies → discovers providers → creates via DI → caches.

### IShippingProvider
```csharp
ShippingProviderMetadata Metadata { get; }
ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(ct);  // Global config
ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetMethodConfigFieldsAsync(ct);  // Per-warehouse
ValueTask ConfigureAsync(ShippingProviderConfiguration? config, ct);
bool IsAvailableFor(ShippingQuoteRequest request);
Task<ShippingRateQuote?> GetRatesAsync(ShippingQuoteRequest request, ct);
Task<ShippingRateQuote?> GetRatesForServicesAsync(request, serviceTypes[], options[], ct);
```
- Currency conversion via `IExchangeRateCache`
- Built-in: `FlatRateShippingProvider`

### IPaymentProvider
```csharp
PaymentProviderMetadata Metadata { get; }
Task<List<PaymentProviderConfigurationField>> GetConfigurationFieldsAsync();
Task ConfigureAsync(Dictionary<string, string> settings);
Task<PaymentSessionResult> CreatePaymentSessionAsync(PaymentSessionRequest request);
Task<PaymentResult> ProcessPaymentAsync(ProcessPaymentRequest request);
Task<RefundResult> RefundPaymentAsync(RefundRequest request);
```
- Built-in: `ManualPaymentProvider`

### ITaxProvider
```csharp
TaxProviderMetadata Metadata { get; }
ValueTask<IEnumerable<TaxProviderConfigurationField>> GetConfigurationFieldsAsync(ct);
ValueTask ConfigureAsync(TaxProviderConfiguration? config, ct);
Task<TaxCalculationResult> CalculateTaxAsync(TaxCalculationRequest request, ct);
Task<TaxProviderValidationResult> ValidateConfigurationAsync(ct);
```
- Single active provider at a time (centralized tax calculation)
- Built-in: `ManualTaxProvider` (uses TaxGroup/TaxGroupRate)

### Config Field Types
`Text`, `Password`, `Number`, `Checkbox`, `Select`, `Textarea`

## 5. Order Grouping

Config: `{ "Merchello": { "OrderGroupingStrategy": "vendor-grouping" } }` (empty = default warehouse grouping)

### IOrderGroupingStrategy
```csharp
OrderGroupingStrategyMetadata Metadata { get; }
Task<OrderGroupingResult> GroupItemsAsync(OrderGroupingContext context, ct);
```

**Context**: Basket, ShippingAddress, Products (dict), Warehouses (list), SelectedShippingOptions

**Output (OrderGroup)**: GroupId (deterministic GUID), GroupName, WarehouseId?, LineItems, AvailableShippingOptions, Metadata

**Default**: Groups by warehouse (stock availability → priority → region serviceability)

## 6. Checkout Flow

### Warehouse Selection
1. Get warehouses from `ProductRootWarehouse` (by priority)
2. Check `CanServeRegion(country, state)`
3. Check stock (`Stock - ReservedStock ≥ qty`)
4. Select first passing warehouse

### Service Region Rules
| Config | Behavior |
|--------|----------|
| No regions | Serves everywhere |
| `US, null, false` | All USA |
| `US, HI, true` | Excludes Hawaii |
| `CA, QC, false` | Only Quebec |

State-specific overrides country-level.

### Shipping Option Resolution
```
1. Base = Product.ShippingOptions ?? Warehouse.ShippingOptions
2. Apply restriction:
   None → base
   AllowList → only Product.AllowedShippingOptions
   ExcludeList → base - Product.ExcludedShippingOptions
```
Different shipping restrictions = separate groups (even same warehouse).

### Flow
```
Basket → IOrderGroupingStrategy.GroupItemsAsync() → Groups
  → Customer selects shipping/group → Invoice (1) → Orders (per group) → Shipments (1+/order)
```

### Package System
```
ProductRoot.DefaultPackageConfigurations (inherited)
     ↓
Product.PackageConfigurations (override if populated)
Product.HsCode (customs classification, varies by variant)
```

**ProductPackage**: Weight (kg), LengthCm?, WidthCm?, HeightCm?

## 7. Inventory & Status

### Order Lifecycle
```
Pending → AwaitingStock → ReadyToFulfill → Processing → Shipped/PartiallyShipped → Completed
Any (except Shipped/Completed) → Cancelled | OnHold
```

### Stock Flow (when TrackStock=true)
```
Order Creation: Check (Stock - Reserved ≥ qty), Reserve (Reserved += qty)
Shipment Creation: Allocate (Stock -= qty, Reserved -= qty)
Cancellation: Release (Reserved -= qty)
```

**TrackStock**: true (default, physical) | false (digital, services, drop-ship)

## 8. Notifications

Hook into CRUD for validation/modification/integration.

```csharp
// Before (can cancel)
public class ValidateHandler : INotificationAsyncHandler<OrderStatusChangingNotification>
{
    public Task HandleAsync(notification, ct) { notification.CancelOperation("Reason"); }
}

// After (react)
public class AuditHandler : INotificationAsyncHandler<OrderStatusChangedNotification>
{
    public Task HandleAsync(notification, ct) { /* log, sync */ }
}
```

### Events
| Domain | Before | After |
|--------|--------|-------|
| Invoice | Saving, Deleting | Saved, Deleted |
| Order | Creating, Saving, StatusChanging | Created, Saved, StatusChanged |
| Payment | Creating | Created, Refunded |
| Shipment | Creating, Saving | Created, Saved |
| Inventory | StockReserving, Releasing, Allocating | StockReserved, Released, Allocated |
| Product | Creating, Saving, Deleting | Created, Saved, Deleted |

**Aggregate**: `InvoiceAggregateChangedNotification` fires on any Invoice/child change.

**Priority** `[NotificationHandlerPriority(n)]`: 100=validation, 500=modification, 1000=default, 2000=external sync

## 9. Webhooks

Outbound webhook system for external integrations (similar to Shopify webhooks).

### Architecture
```
Internal Notification → WebhookNotificationHandler (priority 2000)
                              ↓
                        IWebhookService.QueueDeliveryAsync()
                              ↓
                        WebhookDispatcher → HTTP POST → External Endpoint
                              ↓
                        WebhookDelivery (stored for audit/retry)
                              ↓
                        WebhookDeliveryJob (background retry processor)
```

### Components
| Component | Responsibility |
|-----------|----------------|
| `WebhookSubscription` | Stores endpoint URL, topic, auth config, statistics |
| `WebhookDelivery` | Delivery attempt record with request/response |
| `IWebhookService` | CRUD for subscriptions, queue/retry delivery |
| `IWebhookDispatcher` | HTTP client with HMAC signing |
| `IWebhookTopicRegistry` | Available topics with metadata |
| `WebhookNotificationHandler` | Bridges notifications to webhooks |
| `WebhookDeliveryJob` | Background retry processor |

### Topics
| Category | Topics |
|----------|--------|
| Orders | `order.created`, `order.updated`, `order.status_changed`, `order.cancelled` |
| Invoices | `invoice.created`, `invoice.paid`, `invoice.refunded` |
| Products | `product.created`, `product.updated`, `product.deleted` |
| Customers | `customer.created`, `customer.updated`, `customer.deleted` |
| Shipments | `shipment.created`, `shipment.updated` |
| Discounts | `discount.created`, `discount.updated`, `discount.deleted` |
| Inventory | `inventory.adjusted`, `inventory.low_stock`, `inventory.reserved`, `inventory.allocated` |

### Authentication Types
| Type | Description |
|------|-------------|
| `HmacSha256` | HMAC-SHA256 signature in `X-Merchello-Signature` header (default) |
| `HmacSha512` | HMAC-SHA512 signature |
| `BearerToken` | Bearer token in Authorization header |
| `ApiKey` | Custom header with API key |
| `BasicAuth` | Basic authentication |
| `None` | No authentication |

### Delivery Flow
```
1. Notification fires → WebhookNotificationHandler (priority 2000)
2. Find active subscriptions for topic
3. Create WebhookDelivery record (Status: Pending)
4. WebhookDispatcher.DeliverAsync():
   - Build payload (JSON/FormUrlEncoded)
   - Sign with HMAC (if configured)
   - POST to target URL
   - Record response/status
5. On failure: Schedule retry with exponential backoff
6. WebhookDeliveryJob retries pending deliveries
```

### Configuration
```json
{
  "Merchello": {
    "Webhooks": {
      "Enabled": true,
      "MaxRetries": 5,
      "RetryDelaySeconds": [60, 300, 900, 3600, 14400],
      "TimeoutSeconds": 30,
      "DefaultApiVersion": "2024-01",
      "DeliveryIntervalSeconds": 30,
      "LogRetentionDays": 30
    }
  }
}
```

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/merchello/webhooks/subscriptions` | GET | List subscriptions |
| `/api/merchello/webhooks/subscriptions` | POST | Create subscription |
| `/api/merchello/webhooks/subscriptions/{id}` | GET | Get subscription |
| `/api/merchello/webhooks/subscriptions/{id}` | PUT | Update subscription |
| `/api/merchello/webhooks/subscriptions/{id}` | DELETE | Delete subscription |
| `/api/merchello/webhooks/subscriptions/{id}/test` | POST | Send test webhook |
| `/api/merchello/webhooks/topics` | GET | List available topics |
| `/api/merchello/webhooks/deliveries` | GET | List deliveries |
| `/api/merchello/webhooks/deliveries/{id}` | GET | Get delivery details |
| `/api/merchello/webhooks/deliveries/{id}/retry` | POST | Manual retry |
| `/api/merchello/webhooks/stats` | GET | Delivery statistics |
| `/api/merchello/webhooks/ping` | POST | Test URL connectivity |

## 10. Services

| Service | Responsibility |
|---------|----------------|
| `ICheckoutService` | Basket ops, discounts, shipping quotes, order grouping |
| `ICustomerService` | Customer CRUD, get-or-create by email |
| `ICustomerSegmentService` | Segment CRUD, membership evaluation, criteria matching |
| `ISegmentCriteriaEvaluator` | Criteria evaluation for automated segments |
| `IInvoiceService` | Invoice/order CRUD, status, totals |
| `IInventoryService` | Stock reserve/allocate/release |
| `IProductService` | Product CRUD, variants, options |
| `IShippingService` | Provider config |
| `IShippingQuoteService` | Rate quotes |
| `IPaymentService` | Transactions, refunds, status |
| `ISupplierService` | Supplier mgmt |
| `IWarehouseService` | Selection, regions |
| `ILineItemService` | Unified calculations (basket/invoice), discounts, tax |
| `ITaxService` | Tax groups, geographic rates |
| `ITaxProviderManager` | Tax provider discovery, activation, caching |
| `ICurrencyService` | Formatting, rounding, rates |
| `IDiscountService` | Discount CRUD, validation, usage tracking |
| `IDiscountEngine` | Calculation, validation, application to baskets/invoices |
| `IBuyXGetYCalculator` | BOGO discount calculation logic |
| `IWebhookService` | Webhook subscription CRUD, delivery queue, retry logic |
| `IWebhookDispatcher` | HTTP delivery with HMAC signing |
| `IWebhookTopicRegistry` | Topic discovery and metadata |

**Principles**: DbContext in services only, RORO params, CrudResult<T>, async+CancellationToken, factories for creation

### Background Jobs

| Job | Responsibility |
|-----|----------------|
| `DiscountStatusJob` | Updates discount status (Scheduled→Active, Active→Expired) on schedule |
| `WebhookDeliveryJob` | Processes pending webhook retries with exponential backoff |

## 11. Extension Points

| Point | Interface | Manager |
|-------|-----------|---------|
| Shipping | `IShippingProvider` | `ShippingProviderManager` |
| Payment | `IPaymentProvider` | `PaymentProviderManager` |
| Tax | `ITaxProvider` | `TaxProviderManager` |
| Order grouping | `IOrderGroupingStrategy` | `OrderGroupingStrategyResolver` |
| Order status | `IOrderStatusHandler` | - |
| Entity events | `INotificationAsyncHandler<T>` | Umbraco notifications |
| Webhooks | `IWebhookTopicRegistry` | Topic registration |

**ExtendedData**: All entities have `Dictionary` for custom metadata: `entity.ExtendedData["Key"] = "value";`

## 12. Limitations & Planned

**Current**: Orders require sufficient stock (no backorder), refunds don't restock

**Planned**: Backorder processing, partial fulfillment, return/restock flow, basket reservation expiry, checkout group consolidation
