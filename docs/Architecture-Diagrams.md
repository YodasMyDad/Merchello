# Merchello Architecture

Enterprise ecommerce plugin for Umbraco v17+ (NuGet). **Ethos: making enterprise ecommerce simple.**

**Principles**: Modular (`ExtensionManager`), Services (DI, params), Factories (all domain objects), Multi-warehouse (variant-level stock, priority selection)

Note: Only add DB tables when absolutely necessary.

## Architecture Layers
`CONTROLLERS→Thin:HTTP only,no logic,no DbContext | SERVICES→All business logic,all DB access,CrudResult<T>,RORO | FACTORIES→All object creation,stateless singletons`

## Centralized Logic

### Calculation Flow
`CheckoutService.CalculateBasketAsync()`/`InvoiceService.RecalculateInvoiceTotalsAsync()` → `LineItemService.CalculateFromLineItems()` → `TaxCalculationService.CalculateTaxWithDiscounts()`

|Shared Logic|Method|
|---|---|
|Subtotal|`productItems.Sum(li => Amount * Quantity)`|
|Discounts|Before-tax, after-tax, linked, unlinked|
|Tax pro-rating|`ITaxCalculationService.CalculateTaxWithDiscounts()`|
|Rounding|`ICurrencyService.Round()`|

**Difference**: Basket uses `DefaultTaxRate` (fast preview); Invoice uses stored `TaxRate` + provider (accurate final).

### Line Items
`ILineItemService`: `CalculateFromLineItems()`, `AddDiscountLineItem()`

### Products
`IProductService`: `RegenerateVariants()`, `PreviewAddonPriceAsync()` | Backend calculates `StockStatus` (InStock/LowStock/OutOfStock/Untracked)

### Inventory
`IInventoryService`: `ReserveAsync()`, `AllocateAsync()`, `ReleaseAsync()`
`IWarehouseService`: `AdjustStockAsync()`, `TransferStockAsync()`

### Shipping & Fulfillment
- `IShippingCostResolver`: `ResolveBaseCost()`, `GetTotalShippingCost()` — Priority: State>Country>Universal(`*`)>FixedCost
- `IShippingQuoteService`: `GetQuotesAsync()`
- `IShippingService`: `GetShippingOptionsForBasket()`, `GetRequiredWarehouses()`, `GetShippingOptionsForWarehouseAsync()`, `GetFulfillmentOptionsForProductAsync()`, `GetDefaultFulfillingWarehouseAsync()`, `GetShippingOptionsForProductAsync()`
- `IShipmentService`: `CreateShipmentAsync()`(single), `CreateShipmentsFromOrderAsync()`(batch), `UpdateShipmentAsync()`, `UpdateShipmentStatusAsync()`, `DeleteShipmentAsync()`(releases inventory), `GetFulfillmentSummaryAsync()`

### Locality
`ILocationsService`: `GetAvailableCountriesAsync()`, `GetAvailableRegionsAsync()`, `GetAvailableCountriesForWarehouseAsync()`, `GetAvailableRegionsForWarehouseAsync()`
Data: 249 countries (CultureInfo+JE,GG,IM), 624 subdivisions/30 countries | UK:ENG,SCT,WLS,NIR,BFP | US:50+DC+territories+military
Codes: Internal suffix-only (`ENG`), Display ISO 3166-2 (`GB-ENG`) | Regenerate: `node scripts/generate-locality-data.js`

### Checkout
`ICheckoutService`: `CalculateBasketAsync()`, `ApplyDiscountCodeAsync()`, `RefreshAutomaticDiscountsAsync()`, `SaveAddressesAsync()` (stores marketing opt-in in `CheckoutSession.AcceptsMarketing`)
`IAbandonedCheckoutService`: `TrackCheckoutActivityAsync()`, `DetectAbandonedCheckoutsAsync()`, `SendScheduledRecoveryEmailsAsync()`, `RestoreBasketFromRecoveryAsync()`, `MarkAsConvertedAsync()`, `GetStatsAsync()`

### Invoice & Order
`IInvoiceService`: `RecalculateInvoiceTotals()`, `CreateOrderFromBasketAsync()`, `PreviewInvoiceEditAsync()`, `EditInvoiceAsync()`, `CreateDraftOrderAsync()`, `CancelInvoiceAsync()`

### Customer & Segments
`ICustomerService`: `GetOrCreateByEmailAsync()` (with `acceptsMarketing` param, ratchet-up: only false→true)
`ICustomerSegmentService`: `IsCustomerInSegmentAsync()`

### Discounts
`IDiscountEngine`: `CalculateAsync()`, `ValidateCodeAsync()`, `ApplyDiscountsAsync()`
`IDiscountService`: `RecordUsageAsync()` | `IBuyXGetYCalculator`: `Calculate()` | `IInvoiceService`: `PreviewDiscountAsync()`

### Payment
`IPaymentService`: `CalculatePaymentStatus()`, `CreatePaymentSessionAsync()`, `ProcessPaymentAsync()`, `RecordPaymentAsync()`, `ProcessRefundAsync()`, `RecordManualPaymentAsync()` | Backend calculates `RiskLevel` (high/medium/low/minimal)

### Tax
`ITaxService`: `GetTaxGroups()`, `GetApplicableRateAsync()`, `GetShippingTaxOverrideAsync()`, `CreateShippingTaxOverrideAsync()`, `UpdateShippingTaxOverrideAsync()`, `DeleteShippingTaxOverrideAsync()`
`ITaxProviderManager`: `GetActiveProviderAsync()` → `ITaxProvider.CalculateTaxAsync()`, `IsShippingTaxedForLocationAsync()`, `GetShippingTaxRateForLocationAsync()` | Preview: `TaxApiController.PreviewCustomItemTax()`

### Shipping Tax Architecture

**CRITICAL: Two methods MUST be called at system entry points**

| Method | Purpose | Returns |
|--------|---------|---------|
| `IsShippingTaxedForLocationAsync(country, state)` | Determines IF shipping is taxable | `bool` |
| `GetShippingTaxRateForLocationAsync(country, state)` | Gets the tax RATE to apply | `decimal?` |

**Return Value Semantics for `GetShippingTaxRateForLocationAsync`:**
- `0m` = Shipping explicitly NOT taxable (not proportional)
- `decimal > 0` = Use this specific rate (from regional override or shipping tax group)
- `null` = Use proportional calculation (EU/UK VAT compliant weighted average)

**Entry Points That MUST Call These Methods:**
1. `CheckoutService.CalculateBasketAsync()` - Basket calculations
2. `StorefrontContextService.GetDisplayContextAsync()` - Display context population
3. `InvoiceService.CalculateShippingTaxAsync()` - Invoice totals (fallback path)

**Flow:**
```
Entry Point → IsShippingTaxedForLocationAsync() + GetShippingTaxRateForLocationAsync()
    ↓
Parameters (IsShippingTaxable, ShippingTaxRate)
    ↓
LineItemService / TaxCalculationService (uses parameters, not provider)
    ↓
Display: StorefrontDisplayContext (ShippingTaxRate for tax-inclusive UI)
```

**Priority System (ManualTaxProvider):**
1. Regional shipping tax override with `ShippingTaxGroupId = null` → NOT taxed (0m)
2. Regional shipping tax override with `ShippingTaxGroupId` → Use that group's rate
3. Global shipping tax group configured → Use that group's rate
4. No group configured → Proportional calculation (null)

**Proportional Calculation (centralized):**
When `ShippingTaxRate` is null, use `ITaxCalculationService.CalculateProportionalShippingTax()`:
- Formula: `shippingTax = shippingAmount × (lineItemTax / taxableSubtotal)`
- EU/UK VAT compliant weighted average for mixed-rate orders
- Single implementation used by: `TaxCalculationService`, `ManualTaxProvider`, `InvoiceService`

**DO NOT:**
- Hardcode shipping tax rates
- Calculate shipping tax without consulting the provider methods
- Assume shipping is always taxable or always at a fixed rate
- Duplicate proportional calculation logic - use `CalculateProportionalShippingTax()`

### Currency
`ICurrencyService`: `Round()`, `ToMinorUnits()`, `FromMinorUnits()` | `IExchangeRateCache`: `GetRateAsync()`, `GetRateQuoteAsync()`

---

## Multi-Currency & Tax-Inclusive Display

### ⚠️ CRITICAL: Checkout/Payment vs Display Values

**Display amounts should NEVER be used in checkout or payment flows.**

| Context | Method | Direction | Use For |
|---------|--------|-----------|---------|
| **UI Display** | `basket.GetDisplayAmounts()` | MULTIPLY by rate | Product pages, cart UI, price labels |
| **Checkout/Payment** | `ConvertToPresentmentCurrency()` | DIVIDE by rate | Invoice creation, payment processing |

**Why the difference?** Display amounts show customers what they'll pay in their selected currency. Checkout/payment amounts are the actual transaction values calculated at invoice creation when the exchange rate is locked.

**Bug Example (Fixed):** Express checkout showed PayPal £61.73 (display) but tried to capture £83.98 (store amount incorrectly used). Always use the invoice calculation path for anything involving money changing hands.

**Affected endpoints (fixed):** `GetExpressCheckoutConfig`, `CreateExpressPaymentIntent` - both now use the invoice calculation path with pre-calculated shipping.

```csharp
// ❌ WRONG - Using display amounts for payment
var displayAmounts = basket.GetDisplayAmounts(rate, currencyService, currency);
config.Amount = displayAmounts.Total;  // PayPal sees display-converted amount

// ✅ CORRECT - Using invoice calculation path for payment
var pricingQuote = await exchangeRateCache.GetRateQuoteAsync(presentmentCurrency, storeCurrency, ct);
var total = currencyService.Round(basket.Total / pricingQuote.Rate, presentmentCurrency);
config.Amount = total;  // PayPal sees same amount as invoice will have
```

### Shopify-Style Currency Architecture

**Flow:** `Product(Store$) → Basket(Store$) → Display(on-the-fly) → Invoice(rate locked) → Payment(invoice values)`

| Stage | Currency | Rate |
|-------|----------|------|
| Product prices | Store currency (e.g., USD) | N/A |
| Basket amounts | Store currency | N/A |
| Display to customer | Customer's currency (e.g., GBP) | On-the-fly from cache |
| Invoice creation | Customer's currency | **Locked at creation** |
| Payment processing | Customer's currency | Uses locked invoice rate |
| Reporting (`TotalInStoreCurrency`) | Store currency | Reverse-calculated for aggregation |

**Trade-off:** Slight price fluctuation between browse/checkout acceptable (industry standard).

**Invoice Fields:**
- `CurrencyCode` - Presentment (customer) currency
- `StoreCurrencyCode` - Store's base currency
- `PricingExchangeRate` - Rate locked at invoice creation
- `PricingExchangeRateSource` - Provider name (for audit)
- `PricingExchangeRateTimestampUtc` - When rate was captured
- `TotalInStoreCurrency` - For aggregated reporting

### Tax-Inclusive Display

**Principle:** Products stored NET (ex-tax); tax applied for display only when `DisplayPricesIncTax = true`.

**Calculation Order:**
```
DB Price (NET, Store Currency)
    → Apply Tax Rate (based on customer's country)
    → Convert to Display Currency
    → Display to Customer
```

**Example (USD store, UK customer, 20% VAT, GBP display at 0.80 rate):**
```
Stored:   $100.00 USD (NET)
Calc:     $100 × 1.20 (tax) × 0.80 (currency) = £96.00
Display:  £96.00 inc VAT
```

**StorefrontDisplayContext:** Combines currency and tax settings:
- Currency: `CurrencyCode`, `CurrencySymbol`, `DecimalPlaces`, `ExchangeRate`
- Tax: `DisplayPricesIncTax`, `TaxCountryCode`, `TaxRegionCode`
- Shipping: `IsShippingTaxable`, `ShippingTaxRate`

**What `DisplayPricesIncTax` Affects:**
- Product listings and detail pages (tax baked into displayed price)
- Cart line items (shown tax-inclusive for UX consistency)

**What It Does NOT Affect:**
- Basket storage (stays NET in store currency)
- `LineItemService.CalculateFromLineItems()` (already handles tax separately)
- Invoice creation and payment (use calculated values, not display values)

### Extension Methods

**Display (UI only):**
- `basket.GetDisplayAmounts(displayContext, currencyService)` - Basket totals for UI
- `lineItem.GetDisplayLineItemTotal(displayContext, currencyService)` - Line item for UI
- `product.GetDisplayPriceAsync(displayContext, taxService, currencyService)` - Product price for UI

**Checkout/Invoice (transactions):**
- `currencyService.ConvertToPresentmentCurrency(amount, rate, currency)` - Centralized conversion (divides by rate)
- `InvoiceService.ApplyPricingRateToStoreAmounts(invoice)` - Calculate `TotalInStoreCurrency` for reporting

---

### Reporting
`IReportingService`: `GetSalesBreakdownAsync()`(TotalCost,GrossProfit,GrossProfitMargin), `GetBestSellersAsync()`, `GetOrderStatsAsync()`, `GetDashboardStatsAsync()`, `GetOrdersForExportAsync()`
Cost: `LineItem.Cost` captured at order creation; add-on costs from `ExtendedData["CostAdjustment"]`

### Subscriptions
`ISubscriptionService`: `CreateSubscriptionAsync()`, `CancelSubscriptionAsync()`, `PauseSubscriptionAsync()`, `ResumeSubscriptionAsync()`, `ProcessRenewalAsync()`, `UpdateStatusFromProviderAsync()`, `GetMetricsAsync()`
Products with `IsSubscriptionProduct=true` purchased alone (one per basket)

### Statements
`IStatementService`: `GetOutstandingInvoicesForCustomerAsync()`, `GetOutstandingBalanceAsync()`, `GetOutstandingInvoicesPagedAsync()`, `GenerateStatementPdfAsync()`

## Factories
`InvoiceFactory`(basket/draft) | `OrderFactory` | `PaymentFactory` | `ShipmentFactory` | `BasketFactory` | `ProductFactory`(variants) | `ProductRootFactory`(with options) | `ProductOptionFactory` | `LineItemFactory` | `TaxGroupFactory` | `CustomerFactory` | `CustomerSegmentFactory` | `DiscountFactory`(TargetRules,BuyXGetY,FreeShipping) | `SubscriptionFactory`

## Rules
```csharp
// ❌ Logic in controller    ✅ Delegate to service
payments.Where().Sum()       paymentService.CalculatePaymentStatusAsync(id)
// ❌ Direct instantiation   ✅ Use factory
new Invoice{Id=Guid.NewGuid()}   invoiceFactory.CreateFromBasket(basket,num,addr)
```
**Benefits**: Financial accuracy, auditability, maintainability, testing, thread safety

## Folder Structure
`Feature/├Models/├Factories/├Services/(Interfaces/,Parameters/)├Mapping/├Dtos/└ExtensionMethods/`
Modules: Accounting,Checkout,Customers,Discounts,Email,Products,Shipping,Payments,Subscriptions,Suppliers,Warehouses,Locality,Notifications,Stores,Webhooks

## Entity Relationships
```
Supplier→1:N→Warehouse→1:N→ServiceRegions,ShippingOptions→ShippingCosts|→M:N→ProductRoot(ProductRootWarehouse),Product(ProductWarehouse:Stock,ReservedStock,TrackStock)
ProductRoot→1:N→Product(variant),DefaultPackageConfigurations
Product→1:N→PackageConfigurations,HsCode
Customer→1:N→Invoice(required,auto-created)|→M:N→CustomerSegment(via member/criteria)
CustomerSegment→1:N→CustomerSegmentMember(manual only)
Discount→1:N→TargetRule,EligibilityRule,Usage|→1:1→BuyXGetYConfig?,FreeShippingConfig?
Invoice→1:N→Order→Shipment(N:1 Warehouse),Payment(IdempotencyKey,WebhookEventId for dedup)
Order→1:N→LineItems
WebhookSubscription→1:N→WebhookDelivery(cascade)
Subscription→1:1→Customer,ProductRoot(IsSubscriptionProduct only)|→1:N→SubscriptionInvoice→Invoice
```

## Provider Systems

`ExtensionManager`: scan assemblies→discover→DI create→cache

### IShippingProvider
`Metadata`, `GetConfigurationFieldsAsync()`, `GetMethodConfigFieldsAsync()`, `ConfigureAsync()`, `IsAvailableFor()`, `GetRatesAsync()`, `GetRatesForServicesAsync()`
Built-in: `FlatRateShippingProvider`. Currency via `IExchangeRateCache`.

### IPaymentProvider
`Metadata`, `GetConfigurationFieldsAsync()`, `ConfigureAsync()`, `CreatePaymentSessionAsync()`, `ProcessPaymentAsync()`, `RefundPaymentAsync()`
Built-in: `ManualPaymentProvider`

### ITaxProvider
`Metadata`, `GetConfigurationFieldsAsync()`, `ConfigureAsync()`, `CalculateTaxAsync()`, `ValidateConfigurationAsync()`
Single active provider. Built-in: `ManualTaxProvider`(TaxGroup/TaxGroupRate)

**Config Fields**: Text,Password,Number,Checkbox,Select,Textarea

## Order Grouping

Config: `"Merchello:OrderGroupingStrategy":"vendor-grouping"` (empty=warehouse default)

### IOrderGroupingStrategy
`Metadata`, `GroupItemsAsync(OrderGroupingContext,ct)`
**Context**: Basket,ShippingAddress,Products(dict),Warehouses,SelectedShippingOptions
**Output**: GroupId(deterministic GUID),GroupName,WarehouseId?,LineItems,AvailableShippingOptions,Metadata
**Default**: Groups by warehouse(stock→priority→region)

## Checkout Flow

### Warehouse Selection
1.Get from `ProductRootWarehouse`(by priority) 2.Check `CanServeRegion(country,state)` 3.Check stock(`Stock-ReservedStock≥qty`) 4.Select first passing

### Service Regions
No regions=everywhere | `US,null,false`=all USA | `US,HI,true`=excludes Hawaii | `CA,QC,false`=only Quebec
State-specific overrides country.

### Shipping Resolution
Base=Product.ShippingOptions??Warehouse.ShippingOptions
Restriction: None→base | AllowList→only allowed | ExcludeList→base-excluded
Different restrictions=separate groups(even same warehouse)

### Flow
Basket→GroupItemsAsync()→Groups→Customer selects→Invoice(1)→Orders(/group)→Shipments(1+/order)

### Packages
`ProductRoot.DefaultPackageConfigurations`(inherited)→`Product.PackageConfigurations`(override if populated)
`Product.HsCode`(customs,varies by variant) | ProductPackage:Weight(kg),LengthCm?,WidthCm?,HeightCm?

## Inventory & Status

### Order Lifecycle
Pending→AwaitingStock→ReadyToFulfill→Processing→Shipped/PartiallyShipped→Completed
Any(except Shipped/Completed)→Cancelled|OnHold

### Stock Flow (TrackStock=true)
Create: Check(Stock-Reserved≥qty),Reserve(Reserved+=qty)
Ship: Allocate(Stock-=qty,Reserved-=qty)
Cancel: Release(Reserved-=qty)
TrackStock: true(physical)|false(digital/services/drop-ship)

## Notifications

Hook into CRUD for validation/modification/integration.
```csharp
// Before(can cancel): INotificationAsyncHandler<OrderStatusChangingNotification>→notification.CancelOperation("Reason")
// After(react): INotificationAsyncHandler<OrderStatusChangedNotification>→log,sync
```

### Event Patterns
**Standard CRUD** (Creating✓/Created,Saving✓/Saved,Deleting✓/Deleted where ✓=cancelable):
- Basket: `CheckoutService` - Clearing/Cleared,ItemAdding/Added,ItemRemoving/Removed,QuantityChanging/Changed
- BasketCurrency: `CheckoutService` - Changing/Changed
- Order: `InvoiceService` - Creating/Created,Saving/Saved,StatusChanging/Changed
- Invoice: `InvoiceService` - Saving/Saved,Deleting/Deleted,Cancelling/Cancelled
- Payment: `PaymentService` - Creating/Created,Refunding/Refunded
- Shipment: `ShipmentService` - Creating/Created,Saving/Saved,StatusChanging/Changed
- Product: `ProductService` - all 6 | ProductOption: `ProductService` - Creating/Created,Deleting/Deleted
- Customer: `CustomerService` - all 6 | CustomerSegment: `CustomerSegmentService` - all 6
- Discount: `DiscountService` - all 6+StatusChanging/Changed
- Supplier: `SupplierService` - all 6 | Warehouse: `WarehouseService` - all 6 | TaxGroup: `TaxService` - all 6
- ShippingTaxOverride: `TaxService` - all 6 | ShippingOption: all 6

**Inventory** (`InventoryService`/`WarehouseService`): StockReserving✓/Reserved,StockReleasing✓/Released,StockAllocating✓/Allocated,StockAdjusted,LowStock

**Checkout** (`CheckoutService`): AddressesChanging✓/Changed,DiscountCodeApplying✓/Applied/Removed,ShippingSelectionChanging✓/Changed

**Abandoned** (`AbandonedCheckoutService`): AbandonedFirst/Reminder/Final,Recovered,RecoveryConverted

**Reminders** (`InvoiceReminderJob`): InvoiceReminder,InvoiceOverdue

**Exchange** (`ExchangeRateRefreshJob`): Refreshed,FetchFailed

**Aggregate**: `InvoiceAggregateChangedNotification` on any Invoice/child change
**Caching**: `MerchelloCacheRefresherNotification` for distributed invalidation

### Handler Priority
100=validation(can cancel) | 500=modification | 1000=default | 2000=external sync
```csharp
[NotificationHandlerPriority(100)] class Validator:INotificationAsyncHandler<OrderCreatingNotification>{...notification.CancelOperation("msg")}
[NotificationHandlerPriority(2000)] class Syncer:INotificationAsyncHandler<OrderCreatedNotification>{...externalService.SyncOrderAsync()}
```

### Integration Points
- **Email**: `IEmailTopicRegistry` maps notifications→topics (e.g.`order.created`→Order Confirmation)
- **Webhooks**: `IWebhookTopicRegistry` maps notifications→webhook topics
- Both: Handlers@2000 queue to `OutboundDelivery`, processed by `OutboundDeliveryJob`

**Planned**: `CustomerPasswordResetRequestedNotification` - triggers on password reset request, enables email with reset links

## Webhooks

Outbound system. Shares infra with Email (`OutboundDelivery` in `merchelloOutboundDeliveries`, `DeliveryType`:Webhook=0,Email=1)

### Flow
Notification→WebhookNotificationHandler(2000)→IWebhookService.QueueDeliveryAsync()→WebhookDispatcher→HTTP POST→OutboundDelivery→OutboundDeliveryJob(retry)

### Components
`WebhookSubscription`(URL,topic,auth,stats) | `OutboundDelivery`(unified record) | `IWebhookService`(CRUD,queue) | `IWebhookDispatcher`(HTTP+HMAC) | `IWebhookTopicRegistry` | `WebhookNotificationHandler` | `OutboundDeliveryJob`

### Topics
Orders:created/updated/status_changed/cancelled | Invoices:created/paid/refunded | Products:created/updated/deleted | Customers:created/updated/deleted | Shipments:created/updated | Discounts:created/updated/deleted | Inventory:adjusted/low_stock/reserved/allocated | Checkout:abandoned/recovered/converted | Baskets:created/updated

### Auth Types
HmacSha256(`X-Merchello-Hmac-SHA256`,default) | HmacSha512 | BearerToken | ApiKey | BasicAuth | None

### Payload
`{"id":"...","topic":"order.created","timestamp":"...","api_version":"2024-01","data":{}}`

### Config
`{"Merchello":{"Webhooks":{"Enabled":true,"MaxRetries":5,"RetryDelaysSeconds":[60,300,900,3600,14400],"DeliveryIntervalSeconds":10,"DefaultTimeoutSeconds":30,"MaxPayloadSizeBytes":1000000,"DeliveryLogRetentionDays":30}}}`

### API (`/api/v1/webhooks`)
GET/POST/`{id}`GET/PUT/DELETE | `{id}/test`POST | `{id}/regenerate-secret`POST | `{id}/deliveries`GET | `/topics`GET | `/topics/by-category`GET | `/deliveries/{id}`GET | `/deliveries/{id}/retry`POST | `/stats`GET | `/ping`POST
**Payment Webhooks**(public): POST`/umbraco/merchello/webhooks/payments/{providerAlias}`

## Email System

Automated email via notifications, configured in backoffice Email Builder. Shares infra with Webhooks.

### Flow
Notification→EmailNotificationHandler(2000)→IEmailConfigurationService.GetEnabledByTopicAsync()→IEmailService.QueueDeliveryAsync()→OutboundDeliveryJob→Umbraco IEmailSender

### Components
`EmailConfiguration` | `IEmailService` | `IEmailConfigurationService` | `IEmailTopicRegistry`(13 topics/7 categories) | `IEmailTokenResolver` | `IEmailTemplateDiscoveryService` | `EmailNotificationHandler`

### Topics
Orders:created/status_changed/cancelled | Payments:created/refunded | Shipping:shipment.created/updated | Customers:created/updated/password_reset | Checkout:abandoned/recovered/converted | Inventory:low_stock

### Tokens
`{{order.customerEmail}}`, `{{order.billingAddress.name}}`, `{{store.name}}`, `{{store.websiteUrl}}`

### Config
`{"Merchello":{"Email":{"Enabled":true,"TemplateViewLocations":["/Views/Emails/{0}.cshtml"],"DefaultFromAddress":null,"MaxRetries":3,"RetryDelaysSeconds":[60,300,900],"DeliveryRetentionDays":30}}}`

### API (`/api/v1/emails`)
GET/POST/`{id}`GET/PUT/DELETE | `{id}/toggle`POST | `{id}/test`POST | `{id}/preview`GET | `/topics`GET | `/templates`GET

## Services Summary

`ICheckoutService`(basket,discounts,shipping,grouping) | `IAbandonedCheckoutService`(tracking,recovery,conversion,stats) | `ICustomerService`(CRUD,get-or-create) | `ICustomerSegmentService`(CRUD,membership) | `ISegmentCriteriaEvaluator` | `IInvoiceService`(CRUD,status,totals) | `IInventoryService`(reserve/allocate/release) | `IProductService`(CRUD,variants) | `IShippingService`(config) | `IShippingQuoteService`(rates) | `IShippingCostResolver` | `IShipmentService`(CRUD,tracking,status) | `IPaymentService`(transactions,refunds) | `ISupplierService` | `IWarehouseService`(selection,regions) | `ILineItemService`(calculations) | `ITaxService` | `ITaxProviderManager` | `ICurrencyService` | `IDiscountService` | `IDiscountEngine` | `IBuyXGetYCalculator` | `IWebhookService` | `IWebhookDispatcher` | `IWebhookTopicRegistry` | `IEmailService` | `IEmailConfigurationService` | `IEmailTopicRegistry` | `IEmailTokenResolver` | `IEmailTemplateDiscoveryService` | `IStorefrontContextService` | `ISubscriptionService` | `IReportingService` | `IStatementService`

**Principles**: DbContext in services only, RORO params, CrudResult<T>, async+CancellationToken, factories for creation

### Background Jobs
`DiscountStatusJob`(Scheduled→Active→Expired) | `OutboundDeliveryJob`(webhook+email retry) | `AbandonedCheckoutDetectionJob`(detect,email sequence,expire) | `InvoiceReminderJob`(payment reminders,overdue notices)

### Caching
`ICacheService`→Umbraco `AppCaches`(distributed)
`GetOrCreateAsync(key,factory,ttl,tags)` | `RemoveAsync(key)` | `RemoveByTagAsync(tag)` | `distributedCache.ClearMerchelloCache("prefix")`
Prefixes: `merchello:exchange-rates:*`, `merchello:locality:*`, `merchello:shipping:*`
Dedup: `Payment.IdempotencyKey`, `Payment.WebhookEventId`(DB-based)

## Extension Points

Shipping:`IShippingProvider`→`ShippingProviderManager` | Payment:`IPaymentProvider`→`PaymentProviderManager` | Tax:`ITaxProvider`→`TaxProviderManager` | Grouping:`IOrderGroupingStrategy`→`OrderGroupingStrategyResolver` | Status:`IOrderStatusHandler` | Events:`INotificationAsyncHandler<T>` | Webhooks:`IWebhookTopicRegistry` | Emails:`IEmailTopicRegistry`

**ExtendedData**: All entities have `Dictionary` for custom metadata

## Storefront API (`/api/merchello/storefront`)

Pre-checkout: basket,location,availability
`/basket/add`POST | `/basket`GET | `/basket/count`GET | `/basket/update`POST | `/basket/{lineItemId}`DELETE | `/shipping/countries`GET | `/shipping/country`GET/POST | `/shipping/countries/{code}/regions`GET | `/currency`GET/POST | `/products/{id}/availability`GET | `/basket/availability`GET | `/basket/estimated-shipping`GET

## Checkout API (`/api/merchello/checkout`)

`/basket`GET | `/shipping/countries`GET | `/shipping/regions/{code}`GET | `/billing/countries`GET | `/billing/regions/{code}`GET | `/addresses`POST | `/initialize`POST | `/shipping-groups`GET | `/shipping`POST | `/discount/apply`POST | `/discount/{id}`DELETE | `/payment-methods`GET | `/pay`POST | `/process-payment`POST | `/return`GET | `/cancel`GET | `/express-methods`GET | `/express-config`GET | `/express`POST

### DTOs
**Storefront**: AddToBasketDto,UpdateQuantityDto,StorefrontBasketDto,StorefrontLineItemDto,ShippingCountriesDto,StorefrontCountryDto,StorefrontRegionDto,ProductAvailabilityDto,BasketAvailabilityDto,EstimatedShippingDto
**Checkout**: CheckoutBasketDto,CheckoutLineItemDto,SaveAddressesRequestDto,InitializeCheckoutRequestDto,ShippingGroupDto,ShippingOptionDto,PaymentMethodDto,PaymentSessionResultDto

## Limitations & Planned

**Current**: Orders require sufficient stock(no backorder), refunds don't restock
**Planned**: Backorder, partial fulfillment, return/restock, basket reservation expiry, checkout group consolidation
