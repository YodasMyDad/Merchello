# Merchello Architecture

Enterprise ecommerce plugin for Umbraco v17+ (NuGet). **Ethos: making enterprise ecommerce simple.**

**Principles**: Modular (`ExtensionManager`), Services (DI, params), Factories (all domain objects), Multi-warehouse (variant-level stock, priority selection)

Note: Only add DB tables when absolutely necessary.

## Architecture Layers

```
CONTROLLERS → Thin: HTTP only, no logic, no DbContext
SERVICES → All business logic, all DB access, CrudResult<T>, RORO
FACTORIES → All object creation, stateless singletons
```

## Centralized Logic

### Line Items
- `ILineItemService`: `.CalculateFromLineItems()`, `.AddDiscountLineItem()`

### Products
- `IProductService`: `.RegenerateVariants()`, `.PreviewAddonPriceAsync()`
- Backend calculates `StockStatus` (InStock/LowStock/OutOfStock/Untracked)

### Inventory
- `IInventoryService`: `.ReserveAsync()`, `.AllocateAsync()`, `.ReleaseAsync()`
- `IWarehouseService`: `.AdjustStockAsync()`, `.TransferStockAsync()`

### Shipping & Fulfillment
- `IShippingCostResolver`: `.ResolveBaseCost()`, `.GetTotalShippingCost()` — Priority: State>Country>Universal(`*`)>FixedCost
- `IShippingQuoteService`: `.GetQuotesAsync()`
- `IShippingService`: `.GetShippingOptionsForBasket()`, `.GetRequiredWarehouses()`, `.GetShippingOptionsForWarehouseAsync()`, `.GetFulfillmentOptionsForProductAsync()`, `.GetDefaultFulfillingWarehouseAsync()`, `.GetShippingOptionsForProductAsync()`
- `IShipmentService`: `.CreateShipmentAsync()` (single), `.CreateShipmentsFromOrderAsync()` (batch), `.UpdateShipmentAsync()`, `.UpdateShipmentStatusAsync()`, `.DeleteShipmentAsync()` (releases inventory), `.GetFulfillmentSummaryAsync()`

### Locality
- `ILocationsService`: `.GetAvailableCountriesAsync()`, `.GetAvailableRegionsAsync()`, `.GetAvailableCountriesForWarehouseAsync()`, `.GetAvailableRegionsForWarehouseAsync()`
- Data: 249 countries (CultureInfo + JE,GG,IM), 624 subdivisions/30 countries
- UK: ENG,SCT,WLS,NIR,BFP | US: 50+DC+territories+military
- Codes: Internal suffix-only (`ENG`), Display ISO 3166-2 (`GB-ENG`)
- Regenerate: `node scripts/generate-locality-data.js`

### Checkout
- `ICheckoutService`: `.CalculateBasketAsync()`, `.ApplyDiscountCodeAsync()`, `.RefreshAutomaticDiscountsAsync()`, `.SaveAddressesAsync()` (stores marketing opt-in in `CheckoutSession.AcceptsMarketing`)
- `IAbandonedCheckoutService`: `.TrackCheckoutActivityAsync()`, `.DetectAbandonedCheckoutsAsync()`, `.SendScheduledRecoveryEmailsAsync()`, `.RestoreBasketFromRecoveryAsync()`, `.MarkAsConvertedAsync()`, `.GetStatsAsync()`

### Invoice & Order
- `IInvoiceService`: `.RecalculateInvoiceTotals()`, `.CreateOrderFromBasketAsync()`, `.PreviewInvoiceEditAsync()`, `.EditInvoiceAsync()`, `.CreateDraftOrderAsync()`, `.CancelInvoiceAsync()`

### Customer & Segments
- `ICustomerService`: `.GetOrCreateByEmailAsync()` (with `acceptsMarketing` param, ratchet-up: only false→true)
- `ICustomerSegmentService`: `.IsCustomerInSegmentAsync()`

### Discounts
- `IDiscountEngine`: `.CalculateAsync()`, `.ValidateCodeAsync()`, `.ApplyDiscountsAsync()`
- `IDiscountService`: `.RecordUsageAsync()`
- `IBuyXGetYCalculator`: `.Calculate()`
- `IInvoiceService`: `.PreviewDiscountAsync()`

### Payment
- `IPaymentService`: `.CalculatePaymentStatus()`, `.CreatePaymentSessionAsync()`, `.ProcessPaymentAsync()`, `.RecordPaymentAsync()`, `.ProcessRefundAsync()`, `.RecordManualPaymentAsync()`
- Backend calculates `RiskLevel` (high/medium/low/minimal)

### Tax
- `ITaxService`: `.GetTaxGroups()`, `.GetApplicableRateAsync()`, `.GetShippingTaxOverrideAsync()`, `.CreateShippingTaxOverrideAsync()`, `.UpdateShippingTaxOverrideAsync()`, `.DeleteShippingTaxOverrideAsync()`
- `ITaxProviderManager`: `.GetActiveProviderAsync()` → `ITaxProvider.CalculateTaxAsync()`
- Preview: `TaxApiController.PreviewCustomItemTax()`

### Currency
- `ICurrencyService`: `.Round()`, `.ToMinorUnits()`, `.FromMinorUnits()`
- `IExchangeRateCache`: `.GetRateAsync()`

### Reporting
- `IReportingService`: `.GetSalesBreakdownAsync()` (TotalCost, GrossProfit, GrossProfitMargin), `.GetBestSellersAsync()`, `.GetOrderStatsAsync()`, `.GetDashboardStatsAsync()`, `.GetOrdersForExportAsync()`
- Cost: `LineItem.Cost` captured at order creation; add-on costs from `ExtendedData["CostAdjustment"]`

### Subscriptions
- `ISubscriptionService`: `.CreateSubscriptionAsync()`, `.CancelSubscriptionAsync()`, `.PauseSubscriptionAsync()`, `.ResumeSubscriptionAsync()`, `.ProcessRenewalAsync()`, `.UpdateStatusFromProviderAsync()`, `.GetMetricsAsync()`
- Products with `IsSubscriptionProduct=true` purchased alone (one per basket)

### Statements
- `IStatementService`: `.GetOutstandingInvoicesForCustomerAsync()`, `.GetOutstandingBalanceAsync()`, `.GetOutstandingInvoicesPagedAsync()`, `.GenerateStatementPdfAsync()`

## Factories

`InvoiceFactory` (basket/draft) | `OrderFactory` | `PaymentFactory` | `ShipmentFactory` | `BasketFactory` | `ProductFactory` (variants) | `ProductRootFactory` (with options) | `ProductOptionFactory` | `LineItemFactory` | `TaxGroupFactory` | `CustomerFactory` | `CustomerSegmentFactory` | `DiscountFactory` (TargetRules, BuyXGetY, FreeShipping) | `SubscriptionFactory`

## Rules
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

**Benefits**: Financial accuracy, auditability, maintainability, testing, thread safety

## Folder Structure
```
Feature/ ├── Models/ ├── Factories/ ├── Services/ (Interfaces/, Parameters/) ├── Mapping/ ├── Dtos/ └── ExtensionMethods/
```
Modules: Accounting, Checkout, Customers, Discounts, Email, Products, Shipping, Payments, Subscriptions, Suppliers, Warehouses, Locality, Notifications, Stores, Webhooks

## Entity Relationships
```
Supplier →1:N→ Warehouse →1:N→ ServiceRegions, ShippingOptions→ShippingCosts | →M:N→ ProductRoot (ProductRootWarehouse), Product (ProductWarehouse: Stock, ReservedStock, TrackStock)
ProductRoot →1:N→ Product (variant), DefaultPackageConfigurations
Product →1:N→ PackageConfigurations, HsCode
Customer →1:N→ Invoice (required, auto-created) | →M:N→ CustomerSegment (via member/criteria)
CustomerSegment →1:N→ CustomerSegmentMember (manual only)
Discount →1:N→ TargetRule, EligibilityRule, Usage | →1:1→ BuyXGetYConfig?, FreeShippingConfig?
Invoice →1:N→ Order→Shipment (N:1 Warehouse), Payment (IdempotencyKey, WebhookEventId for dedup)
Order →1:N→ LineItems
WebhookSubscription →1:N→ WebhookDelivery (cascade)
Subscription →1:1→ Customer, ProductRoot (IsSubscriptionProduct only) | →1:N→ SubscriptionInvoice→Invoice
```

## Provider Systems

`ExtensionManager`: scan assemblies → discover → DI create → cache

### IShippingProvider
`Metadata`, `GetConfigurationFieldsAsync()`, `GetMethodConfigFieldsAsync()`, `ConfigureAsync()`, `IsAvailableFor()`, `GetRatesAsync()`, `GetRatesForServicesAsync()`
Built-in: `FlatRateShippingProvider`. Currency via `IExchangeRateCache`.

### IPaymentProvider
`Metadata`, `GetConfigurationFieldsAsync()`, `ConfigureAsync()`, `CreatePaymentSessionAsync()`, `ProcessPaymentAsync()`, `RefundPaymentAsync()`
Built-in: `ManualPaymentProvider`

### ITaxProvider
`Metadata`, `GetConfigurationFieldsAsync()`, `ConfigureAsync()`, `CalculateTaxAsync()`, `ValidateConfigurationAsync()`
Single active provider. Built-in: `ManualTaxProvider` (TaxGroup/TaxGroupRate)

**Config Fields**: Text, Password, Number, Checkbox, Select, Textarea

## Order Grouping

Config: `"Merchello:OrderGroupingStrategy": "vendor-grouping"` (empty=warehouse default)

### IOrderGroupingStrategy
`Metadata`, `GroupItemsAsync(OrderGroupingContext, ct)`

**Context**: Basket, ShippingAddress, Products (dict), Warehouses, SelectedShippingOptions
**Output**: GroupId (deterministic GUID), GroupName, WarehouseId?, LineItems, AvailableShippingOptions, Metadata
**Default**: Groups by warehouse (stock→priority→region)

## Checkout Flow

### Warehouse Selection
1. Get from `ProductRootWarehouse` (by priority)
2. Check `CanServeRegion(country, state)`
3. Check stock (`Stock - ReservedStock ≥ qty`)
4. Select first passing

### Service Regions
No regions=everywhere | `US,null,false`=all USA | `US,HI,true`=excludes Hawaii | `CA,QC,false`=only Quebec
State-specific overrides country.

### Shipping Resolution
Base=Product.ShippingOptions ?? Warehouse.ShippingOptions
Restriction: None→base | AllowList→only allowed | ExcludeList→base-excluded
Different restrictions=separate groups (even same warehouse)

### Flow
Basket → GroupItemsAsync() → Groups → Customer selects → Invoice(1) → Orders(/group) → Shipments(1+/order)

### Packages
`ProductRoot.DefaultPackageConfigurations` (inherited) → `Product.PackageConfigurations` (override if populated)
`Product.HsCode` (customs, varies by variant)
ProductPackage: Weight(kg), LengthCm?, WidthCm?, HeightCm?

## Inventory & Status

### Order Lifecycle
Pending → AwaitingStock → ReadyToFulfill → Processing → Shipped/PartiallyShipped → Completed
Any (except Shipped/Completed) → Cancelled | OnHold

### Stock Flow (TrackStock=true)
Create: Check (Stock-Reserved≥qty), Reserve (Reserved+=qty)
Ship: Allocate (Stock-=qty, Reserved-=qty)
Cancel: Release (Reserved-=qty)

TrackStock: true (physical) | false (digital/services/drop-ship)

## Notifications

Hook into CRUD for validation/modification/integration.
```csharp
// Before (can cancel): INotificationAsyncHandler<OrderStatusChangingNotification> → notification.CancelOperation("Reason")
// After (react): INotificationAsyncHandler<OrderStatusChangedNotification> → log, sync
```

### Events
- Basket: Clearing/Cleared, ItemAdding/Added, ItemRemoving/Removed, QuantityChanging/Changed
- BasketCurrency: Changing/Changed
- Checkout: AddressesChanging/Changed, DiscountCodeApplying/Applied/Removed, ShippingSelectionChanging/Changed, Abandoned, Recovered, RecoveryConverted
- Customer: Creating/Created, Saving/Saved, Deleting/Deleted, PasswordResetRequested
- CustomerSegment: Creating/Created, Saving/Saved, Deleting/Deleted
- Discount: Creating/Created, Saving/Saved, Deleting/Deleted, StatusChanging/Changed
- ExchangeRate: Refreshed, FetchFailed
- Inventory: StockReserving/Reserved, StockReleasing/Released, StockAllocating/Allocated, StockAdjusted, LowStock
- Invoice: Saving/Saved, Deleting/Deleted, Cancelling/Cancelled
- Order: Creating/Created, Saving/Saved, StatusChanging/Changed
- OrderGrouping: Modifying, Completed
- Payment: Creating/Created, Refunding/Refunded
- Product: Creating/Created, Saving/Saved, Deleting/Deleted
- ProductOption: Creating/Created, Deleting/Deleted
- Shipment: Creating/Created, Saving/Saved
- ShippingOption: Creating/Created, Saving/Saved, Deleting/Deleted
- Supplier/TaxGroup/Warehouse: Creating/Created, Saving/Saved, Deleting/Deleted
- ShippingTaxOverride: Creating/Created, Saving/Saved, Deleting/Deleted

**Aggregate**: `InvoiceAggregateChangedNotification` on any Invoice/child change
**Caching**: `MerchelloCacheRefresherNotification` for distributed invalidation
**Priority**: 100=validation, 500=modification, 1000=default, 2000=external sync

### Implementation Status (Audit: Jan 2026)

**Working**: Notifications that are published AND have handlers registered:
- Order: Creating/Created, Saving/Saved, StatusChanging/Changed (`IInvoiceService`)
- Invoice: Saving/Saved, Cancelling/Cancelled, Deleting/Deleted (`IInvoiceService`)
- Payment: Creating/Created, Refunding/Refunded (`IPaymentService`)
- Shipment: Creating/Created, Saving/Saved, StatusChanging/Changed (`IShipmentService`)
- Customer: Creating/Created, Saving/Saved, Deleting/Deleted (`ICustomerService`)
- Product: Creating/Created, Saving/Saved, Deleting/Deleted (`IProductService`)
- ProductOption: Creating/Created, Deleting/Deleted (`IProductService`)
- CustomerSegment: All 6 notifications (`ICustomerSegmentService`)
- Discount: All 8 notifications (`IDiscountService`)
- Supplier: All 6 notifications (`ISupplierService`)
- Warehouse: Creating/Created, Saving/Saved, Deleting/Deleted (`IWarehouseService`)
- TaxGroup: Creating/Created, Saving/Saved, Deleting/Deleted (`ITaxService`)
- ShippingTaxOverride: All 6 notifications (`ITaxService`)
- Inventory: All 8 notifications (Reserve/Release/Allocate/Adjust/LowStock) (`IInventoryService`)
- ExchangeRate: Refreshed, FetchFailed (`ExchangeRateRefreshJob`)
- Checkout: AddressesChanging/Changed, DiscountCodeApplying/Applied, ShippingSelectionChanging/Changed, BasketCurrencyChanging/Changed (`ICheckoutService`)
- Basket: ItemAdding/Added, ItemRemoving/Removed, QuantityChanging/Changed, Clearing/Cleared (`ICheckoutService`)
- Checkout (Abandoned): AbandonedFirst/Reminder/Final, Recovered, RecoveryConverted (`IAbandonedCheckoutService`)
- Invoice (Reminders): Reminder, Overdue (`InvoiceReminderJob`)

### Notification Reference

| Category | Notification | Service | Cancelable |
|----------|--------------|---------|------------|
| **Basket** | `BasketItemAddingNotification` | `CheckoutService` | Yes |
| | `BasketItemAddedNotification` | `CheckoutService` | No |
| | `BasketItemRemovingNotification` | `CheckoutService` | Yes |
| | `BasketItemRemovedNotification` | `CheckoutService` | No |
| | `BasketItemQuantityChangingNotification` | `CheckoutService` | Yes |
| | `BasketItemQuantityChangedNotification` | `CheckoutService` | No |
| | `BasketClearingNotification` | `CheckoutService` | Yes |
| | `BasketClearedNotification` | `CheckoutService` | No |
| **Order** | `OrderCreatingNotification` | `InvoiceService` | Yes |
| | `OrderCreatedNotification` | `InvoiceService` | No |
| | `OrderSavingNotification` | `InvoiceService` | Yes |
| | `OrderSavedNotification` | `InvoiceService` | No |
| | `OrderStatusChangingNotification` | `InvoiceService` | Yes |
| | `OrderStatusChangedNotification` | `InvoiceService` | No |
| **Invoice** | `InvoiceSavingNotification` | `InvoiceService` | Yes |
| | `InvoiceSavedNotification` | `InvoiceService` | No |
| | `InvoiceCancellingNotification` | `InvoiceService` | Yes |
| | `InvoiceCancelledNotification` | `InvoiceService` | No |
| **Payment** | `PaymentCreatingNotification` | `PaymentService` | Yes |
| | `PaymentCreatedNotification` | `PaymentService` | No |
| | `PaymentRefundingNotification` | `PaymentService` | Yes |
| | `PaymentRefundedNotification` | `PaymentService` | No |
| **Shipment** | `ShipmentCreatingNotification` | `ShipmentService` | Yes |
| | `ShipmentCreatedNotification` | `ShipmentService` | No |
| | `ShipmentSavingNotification` | `ShipmentService` | Yes |
| | `ShipmentSavedNotification` | `ShipmentService` | No |
| | `ShipmentStatusChangingNotification` | `ShipmentService` | Yes |
| | `ShipmentStatusChangedNotification` | `ShipmentService` | No |
| **Product** | `ProductCreatingNotification` | `ProductService` | Yes |
| | `ProductCreatedNotification` | `ProductService` | No |
| | `ProductSavingNotification` | `ProductService` | Yes |
| | `ProductSavedNotification` | `ProductService` | No |
| | `ProductDeletingNotification` | `ProductService` | Yes |
| | `ProductDeletedNotification` | `ProductService` | No |
| | `ProductOptionCreatingNotification` | `ProductService` | Yes |
| | `ProductOptionCreatedNotification` | `ProductService` | No |
| | `ProductOptionDeletingNotification` | `ProductService` | Yes |
| | `ProductOptionDeletedNotification` | `ProductService` | No |
| **Customer** | `CustomerCreatingNotification` | `CustomerService` | Yes |
| | `CustomerCreatedNotification` | `CustomerService` | No |
| | `CustomerSavingNotification` | `CustomerService` | Yes |
| | `CustomerSavedNotification` | `CustomerService` | No |
| | `CustomerDeletingNotification` | `CustomerService` | Yes |
| | `CustomerDeletedNotification` | `CustomerService` | No |
| **Warehouse** | `WarehouseCreatingNotification` | `WarehouseService` | Yes |
| | `WarehouseCreatedNotification` | `WarehouseService` | No |
| | `WarehouseSavingNotification` | `WarehouseService` | Yes |
| | `WarehouseSavedNotification` | `WarehouseService` | No |
| | `WarehouseDeletingNotification` | `WarehouseService` | Yes |
| | `WarehouseDeletedNotification` | `WarehouseService` | No |
| **TaxGroup** | `TaxGroupCreatingNotification` | `TaxService` | Yes |
| | `TaxGroupCreatedNotification` | `TaxService` | No |
| | `TaxGroupSavingNotification` | `TaxService` | Yes |
| | `TaxGroupSavedNotification` | `TaxService` | No |
| | `TaxGroupDeletingNotification` | `TaxService` | Yes |
| | `TaxGroupDeletedNotification` | `TaxService` | No |
| **ShippingTaxOverride** | `ShippingTaxOverrideCreatingNotification` | `TaxService` | Yes |
| | `ShippingTaxOverrideCreatedNotification` | `TaxService` | No |
| | `ShippingTaxOverrideSavingNotification` | `TaxService` | Yes |
| | `ShippingTaxOverrideSavedNotification` | `TaxService` | No |
| | `ShippingTaxOverrideDeletingNotification` | `TaxService` | Yes |
| | `ShippingTaxOverrideDeletedNotification` | `TaxService` | No |
| **Inventory** | `StockReservingNotification` | `InventoryService` | Yes |
| | `StockReservedNotification` | `InventoryService` | No |
| | `StockReleasingNotification` | `InventoryService` | Yes |
| | `StockReleasedNotification` | `InventoryService` | No |
| | `StockAllocatingNotification` | `InventoryService` | Yes |
| | `StockAllocatedNotification` | `InventoryService` | No |
| | `StockAdjustedNotification` | `WarehouseService` | No |
| | `LowStockNotification` | `InventoryService` | No |
| **Checkout (Abandoned)** | `CheckoutAbandonedFirstNotification` | `AbandonedCheckoutService` | No |
| | `CheckoutAbandonedReminderNotification` | `AbandonedCheckoutService` | No |
| | `CheckoutAbandonedFinalNotification` | `AbandonedCheckoutService` | No |
| | `CheckoutRecoveredNotification` | `AbandonedCheckoutService` | No |
| | `CheckoutRecoveryConvertedNotification` | `AbandonedCheckoutService` | No |
| **Invoice (Reminders)** | `InvoiceReminderNotification` | `InvoiceReminderJob` | No |
| | `InvoiceOverdueNotification` | `InvoiceReminderJob` | No |

### Handler Priority System

Handlers execute in priority order (lower = earlier):
- **100**: Validation handlers (can cancel operations)
- **500**: Modification handlers (can adjust data)
- **1000**: Default priority
- **2000**: External integration handlers (email, webhooks, sync)

```csharp
// Example: Validation handler at priority 100
[NotificationHandlerPriority(100)]
public class OrderValidationHandler : INotificationAsyncHandler<OrderCreatingNotification>
{
    public async Task HandleAsync(OrderCreatingNotification notification, CancellationToken ct)
    {
        if (!IsValid(notification.Entity))
            notification.CancelOperation("Validation failed");
    }
}

// Example: External sync at priority 2000
[NotificationHandlerPriority(2000)]
public class OrderSyncHandler : INotificationAsyncHandler<OrderCreatedNotification>
{
    public async Task HandleAsync(OrderCreatedNotification notification, CancellationToken ct)
    {
        await externalService.SyncOrderAsync(notification.Order);
    }
}
```

### Integration Points

- **Email**: `IEmailTopicRegistry` maps notifications to email topics (e.g., `order.created` → Order Confirmation email)
- **Webhooks**: `IWebhookTopicRegistry` maps notifications to webhook topics (e.g., `order.created` webhook)
- **Both**: Handlers at priority 2000 queue to `OutboundDelivery` table, processed by `OutboundDeliveryJob`

**TODO - Future sprints** (handlers registered but notification not yet published):
| Notification | Planned Implementation | Impact |
|--------------|------------------------|--------|
| `CustomerPasswordResetRequestedNotification` | Future sprint: Password reset flow | Password reset emails |

## Webhooks

Outbound webhook system. Shares delivery infra with Email (`OutboundDelivery` in `merchelloOutboundDeliveries`, `DeliveryType`: Webhook=0, Email=1).

### Flow
Notification → WebhookNotificationHandler(2000) → IWebhookService.QueueDeliveryAsync() → WebhookDispatcher → HTTP POST → OutboundDelivery → OutboundDeliveryJob (retry)

### Components
`WebhookSubscription` (URL, topic, auth, stats) | `OutboundDelivery` (unified record) | `IWebhookService` (CRUD, queue) | `IWebhookDispatcher` (HTTP+HMAC) | `IWebhookTopicRegistry` | `WebhookNotificationHandler` | `OutboundDeliveryJob`

### Topics
Orders: created, updated, status_changed, cancelled | Invoices: created, paid, refunded | Products: created, updated, deleted | Customers: created, updated, deleted | Shipments: created, updated | Discounts: created, updated, deleted | Inventory: adjusted, low_stock, reserved, allocated | Checkout: abandoned, recovered, converted | Baskets: created, updated

### Auth Types
HmacSha256 (`X-Merchello-Hmac-SHA256`, default) | HmacSha512 | BearerToken | ApiKey | BasicAuth | None

### Payload
```json
{"id":"...","topic":"order.created","timestamp":"...","api_version":"2024-01","data":{}}
```

### Config
```json
{"Merchello":{"Webhooks":{"Enabled":true,"MaxRetries":5,"RetryDelaysSeconds":[60,300,900,3600,14400],"DeliveryIntervalSeconds":10,"DefaultTimeoutSeconds":30,"MaxPayloadSizeBytes":1000000,"DeliveryLogRetentionDays":30}}}
```

### Backoffice API (`/api/v1/webhooks`)
GET/ POST/ `{id}` GET/PUT/DELETE | `{id}/test` POST | `{id}/regenerate-secret` POST | `{id}/deliveries` GET | `/topics` GET | `/topics/by-category` GET | `/deliveries/{id}` GET | `/deliveries/{id}/retry` POST | `/stats` GET | `/ping` POST

**Payment Webhooks** (public): POST `/umbraco/merchello/webhooks/payments/{providerAlias}`

## Email System

Automated email via notifications, configured in backoffice Email Builder. Shares delivery infra with Webhooks.

### Flow
Notification → EmailNotificationHandler(2000) → IEmailConfigurationService.GetEnabledByTopicAsync() → IEmailService.QueueDeliveryAsync() → OutboundDeliveryJob → Umbraco IEmailSender

### Components
`EmailConfiguration` | `IEmailService` | `IEmailConfigurationService` | `IEmailTopicRegistry` (13 topics/7 categories) | `IEmailTokenResolver` | `IEmailTemplateDiscoveryService` | `EmailNotificationHandler`

### Topics
Orders: created, status_changed, cancelled | Payments: created, refunded | Shipping: shipment.created, shipment.updated | Customers: created, updated, password_reset | Checkout: abandoned, recovered, converted | Inventory: low_stock

### Tokens
`{{order.customerEmail}}`, `{{order.billingAddress.name}}`, `{{store.name}}`, `{{store.websiteUrl}}`

### Config
```json
{"Merchello":{"Email":{"Enabled":true,"TemplateViewLocations":["/Views/Emails/{0}.cshtml"],"DefaultFromAddress":null,"MaxRetries":3,"RetryDelaysSeconds":[60,300,900],"DeliveryRetentionDays":30}}}
```

### API (`/api/v1/emails`)
GET/ POST/ `{id}` GET/PUT/DELETE | `{id}/toggle` POST | `{id}/test` POST | `{id}/preview` GET | `/topics` GET | `/templates` GET

## Services Summary

`ICheckoutService` (basket, discounts, shipping, grouping) | `IAbandonedCheckoutService` (tracking, recovery, conversion, stats) | `ICustomerService` (CRUD, get-or-create) | `ICustomerSegmentService` (CRUD, membership) | `ISegmentCriteriaEvaluator` | `IInvoiceService` (CRUD, status, totals) | `IInventoryService` (reserve/allocate/release) | `IProductService` (CRUD, variants) | `IShippingService` (config) | `IShippingQuoteService` (rates) | `IShippingCostResolver` | `IShipmentService` (CRUD, tracking, status) | `IPaymentService` (transactions, refunds) | `ISupplierService` | `IWarehouseService` (selection, regions) | `ILineItemService` (calculations) | `ITaxService` | `ITaxProviderManager` | `ICurrencyService` | `IDiscountService` | `IDiscountEngine` | `IBuyXGetYCalculator` | `IWebhookService` | `IWebhookDispatcher` | `IWebhookTopicRegistry` | `IEmailService` | `IEmailConfigurationService` | `IEmailTopicRegistry` | `IEmailTokenResolver` | `IEmailTemplateDiscoveryService` | `IStorefrontContextService` | `ISubscriptionService` | `IReportingService` | `IStatementService`

**Principles**: DbContext in services only, RORO params, CrudResult<T>, async+CancellationToken, factories for creation

### Background Jobs
`DiscountStatusJob` (Scheduled→Active→Expired) | `OutboundDeliveryJob` (webhook+email retry) | `AbandonedCheckoutDetectionJob` (detect, email sequence, expire) | `InvoiceReminderJob` (payment reminders, overdue notices)

### Caching
`ICacheService` → Umbraco `AppCaches` (distributed)
`.GetOrCreateAsync(key,factory,ttl,tags)` | `.RemoveAsync(key)` | `.RemoveByTagAsync(tag)` | `distributedCache.ClearMerchelloCache("prefix")`
Prefixes: `merchello:exchange-rates:*`, `merchello:locality:*`, `merchello:shipping:*`
Dedup: `Payment.IdempotencyKey`, `Payment.WebhookEventId` (DB-based)

## Extension Points

Shipping: `IShippingProvider`→`ShippingProviderManager` | Payment: `IPaymentProvider`→`PaymentProviderManager` | Tax: `ITaxProvider`→`TaxProviderManager` | Grouping: `IOrderGroupingStrategy`→`OrderGroupingStrategyResolver` | Status: `IOrderStatusHandler` | Events: `INotificationAsyncHandler<T>` | Webhooks: `IWebhookTopicRegistry` | Emails: `IEmailTopicRegistry`

**ExtendedData**: All entities have `Dictionary` for custom metadata

## Storefront API (`/api/merchello/storefront`)

Pre-checkout: basket, location, availability

`/basket/add` POST | `/basket` GET | `/basket/count` GET | `/basket/update` POST | `/basket/{lineItemId}` DELETE | `/shipping/countries` GET | `/shipping/country` GET/POST | `/shipping/countries/{code}/regions` GET | `/currency` GET/POST | `/products/{id}/availability` GET | `/basket/availability` GET | `/basket/estimated-shipping` GET

## Checkout API (`/api/merchello/checkout`)

`/basket` GET | `/shipping/countries` GET | `/shipping/regions/{code}` GET | `/billing/countries` GET | `/billing/regions/{code}` GET | `/addresses` POST | `/initialize` POST | `/shipping-groups` GET | `/shipping` POST | `/discount/apply` POST | `/discount/{id}` DELETE | `/payment-methods` GET | `/pay` POST | `/process-payment` POST | `/return` GET | `/cancel` GET | `/express-methods` GET | `/express-config` GET | `/express` POST

### DTOs
**Storefront**: AddToBasketDto, UpdateQuantityDto, StorefrontBasketDto, StorefrontLineItemDto, ShippingCountriesDto, StorefrontCountryDto, StorefrontRegionDto, ProductAvailabilityDto, BasketAvailabilityDto, EstimatedShippingDto
**Checkout**: CheckoutBasketDto, CheckoutLineItemDto, SaveAddressesRequestDto, InitializeCheckoutRequestDto, ShippingGroupDto, ShippingOptionDto, PaymentMethodDto, PaymentSessionResultDto

## Limitations & Planned

**Current**: Orders require sufficient stock (no backorder), refunds don't restock
**Planned**: Backorder, partial fulfillment, return/restock, basket reservation expiry, checkout group consolidation
