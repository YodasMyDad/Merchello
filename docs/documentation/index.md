# Merchello Documentation

Enterprise ecommerce NuGet package for Umbraco v17+. **Ethos: making enterprise ecommerce simple.**

This documentation is for developers building ecommerce sites using Merchello as a NuGet package.

---

## 1. Getting Started

### 1.1 Introduction
Introduce Merchello as an enterprise ecommerce NuGet package for Umbraco v17+ with the ethos of making enterprise ecommerce simple. Cover the modular, pluggable architecture and key features.

### 1.2 Installation
Guide through NuGet installation, Umbraco v17+ requirements, database setup (SQL Server/SQLite), and initial appsettings.json configuration.

### 1.3 Quick Start Guide
Walk through creating a first product, setting up a warehouse, configuring shipping/payment, and building a simple checkout flow.

### 1.4 Configuration Reference
Document all MerchelloSettings options including:
- `StoreCurrencyCode` - Base store currency
- `DisplayPricesIncTax` - Tax-inclusive price display
- `ProductElementTypeAlias` - Umbraco Element Type for product properties
- `ProductViewLocations` - View discovery paths (default: `["~/Views/Products/"]`)
- `Webhooks` - Webhook delivery settings
- `Email` - Email delivery settings
- `Protocols` - UCP and other protocol adapter settings

---

## 2. Architecture & Core Concepts

### 2.1 Architecture Overview
Explain the three-layer architecture:
```
CONTROLLERS → Thin: HTTP only, no logic, no DbContext
     ↓
SERVICES    → All business logic, all DB access, CrudResult<T>, RORO params
     ↓
FACTORIES   → All object creation, stateless singletons
```

Design principles:
- Controllers never access DbContext - always inject services
- All service methods use RORO (Request/Response as Objects) parameters
- Return `CrudResult<T>` for operations that can fail
- Always use `async/await` with `CancellationToken`
- Use factories for entity creation

### 2.2 Feature Folder Structure
Document the standard feature folder structure:
```
Feature/
├── Models/           # Domain entities
├── Dtos/             # API transfer objects
├── Factories/        # Object creation
├── Services/
│   ├── Interfaces/   # Service contracts
│   └── Parameters/   # RORO parameter objects
├── Mapping/          # EF Core mappings
└── Extensions/       # Extension methods
```

### 2.3 Services
Document the service pattern conventions including DbContext usage, CrudResult<T> pattern, async/await with CancellationToken, and RORO parameters.

### 2.4 Factories
Explain why all domain objects are created via factories (thread safety, consistency) and list all factories:

| Factory | Creates |
|---------|---------|
| `InvoiceFactory` | `FromBasket(source?)`, `CreateDraft()` - Both set `Invoice.Source` for origin tracking |
| `OrderFactory` | `Create(invoiceId, warehouseId, shippingOptionId, ...)` |
| `PaymentFactory` | `CreatePayment()`, `CreateManualPayment()`, `CreateRefund()`, `CreateManualRefund()` |
| `ShipmentFactory` | `Create(order, ...)`, `Create(orderId, warehouseId, ...)` |
| `BasketFactory` | `Create(customerId, currencyCode, symbol)` |
| `ProductFactory` | `Create(productRoot, name, price, ...)` |
| `ProductRootFactory` | `Create(name, taxGroup, productType, options)` |
| `ProductOptionFactory` | `Create(params)`, `CreateEmpty()`, `CreateEmptyValue()` |
| `LineItemFactory` | `CreateFromProduct()`, `CreateShippingLineItem()`, `CreateForOrder()`, `CreateAddonForOrder()`, `CreateDiscountForOrder()` |
| `TaxGroupFactory` | `Create(name, taxPercentage)` |
| `CustomerFactory` | `CreateFromEmail()`, `Create(params)` |
| `CustomerSegmentFactory` | `Create(params)`, `CreateMember()` |
| `DiscountFactory` | `Create(params)`, `CreateTargetRule()`, `CreateEligibilityRule()`, `CreateBuyXGetYConfig()`, `CreateFreeShippingConfig()` |
| `DownloadLinkFactory` | `Create(params)` - Creates secure download link with HMAC token |

### 2.5 Extension Manager
Explain `ExtensionManager` assembly scanning for discovering provider implementations:
```csharp
public class ExtensionManager(IServiceProvider serviceProvider)
{
    public Type GetImplementation<T>(bool useCaching = false);
    public IEnumerable<Type> GetImplementations<T>(bool useCaching = false);
    public T? GetInstance<T>(bool useCaching = false);
    public IEnumerable<T?> GetInstances<T>(bool useCaching = false);
}
```

Auto-discovers: ShippingProviders, PaymentProviders, TaxProviders, OrderGroupingStrategies, ExchangeRateProviders, CommerceProtocolAdapters.

---

## 3. Products

### 3.1 Product Model Hierarchy
Explain the ProductRoot (parent) vs Product (variant) relationship:
- `ProductRoot` - Parent with options, TaxGroupId, DefaultPackageConfigurations
- `Product` - Variant with specific SKU, price, stock per warehouse, PackageConfigurations, HsCode

### 3.2 Product Options
Cover variant options vs add-on options:
- **Variant options** (`IsVariant=true`, default) - Generate variant combinations
- **Add-on options** (`IsVariant=false`) - PriceAdjustment, CostAdjustment, SkuSuffix without creating variants

### 3.3 Product Types
Document ProductType entity for categorizing products and how to filter/query by type.

### 3.4 Collections
Explain ProductCollection for categorizing ProductRoots with many-to-many relationships and collection-based filtering.

### 3.5 Filters & Filter Groups
Document the product filtering system including FilterGroups, ProductFilter values with HexColour and Image properties.

### 3.6 Product Images
Explain RootImages vs variant Images, ExcludeRootProductImages flag, and image resolution patterns in views.

### 3.7 Package Configurations
Cover DefaultPackageConfigurations on ProductRoot inherited by variants, with variant-level PackageConfigurations override.
- `ProductPackage`: Weight(kg), LengthCm?, WidthCm?, HeightCm?
- `Product.HsCode` for customs (varies by variant)

### 3.8 Stock Status
Backend calculates `StockStatus` enum: `InStock` | `LowStock` | `OutOfStock` | `Untracked`

---

## 4. Digital Products

### 4.1 Digital Product Configuration
Digital products use `ProductRoot.ExtendedData` with constant keys (no new model properties):
- `DigitalDeliveryMethod` - "InstantDownload" or "EmailDelivered"
- `DigitalFileIds` - JSON array of Umbraco Media IDs
- `DownloadLinkExpiryDays` - Link expiry (0 = unlimited)
- `MaxDownloadsPerLink` - Download limit (0 = unlimited)

### 4.2 Delivery Methods

| Method | Confirmation Page | Email | Use Case |
|--------|------------------|-------|----------|
| **InstantDownload** | Shows links | Sends email | Standard digital products |
| **EmailDelivered** | Hidden | Email only | License keys, time-sensitive content |

### 4.3 Digital Product Service
Document `IDigitalProductService`:
- `CreateDownloadLinksAsync()` - Create download links for invoice (idempotent)
- `ValidateDownloadTokenAsync()` - Validate HMAC-signed download token
- `RecordDownloadAsync()` - Record download and increment counter
- `GetCustomerDownloadsAsync()` - Get customer's download links
- `GetInvoiceDownloadsAsync()` - Get download links for invoice
- `IsDigitalOnlyInvoiceAsync()` - Check if invoice contains only digital products
- `RegenerateDownloadLinksAsync()` - Invalidate old links and create new ones

### 4.4 Constraints & Security
- Digital products require customer account (no guest checkout)
- Digital products cannot have variant options (add-ons only: `IsVariant = false`)
- Digital-only orders auto-complete on successful payment
- HMAC-SHA256 token signing with constant-time comparison
- Rate limiting on download endpoint (30 requests/minute)
- Token format: `{linkId:N}-{hmacSignature}`

---

## 5. Product Rendering & Routing

### 5.1 Product URL Routing
Products are rendered at root-level URLs without requiring Umbraco content nodes:
- `/{root-url}` → ProductRoot with default variant
- `/{root-url}/{variant-url}` → ProductRoot with specific variant

**Request Flow:**
```
1. ProductContentFinder.TryFindContent() matches RootUrl
2. Creates MerchelloPublishedProduct (ContentType.Alias = "MerchelloProduct")
3. Umbraco route hijacking routes to MerchelloProductController
4. Controller renders ~/Views/Products/{ViewAlias}.cshtml
5. View receives MerchelloProductViewModel
```

### 5.2 ViewAlias System
Explain how `ViewAlias` on ProductRoot maps to `~/Views/Products/{ViewAlias}.cshtml`:
- Views discovered via `ApplicationPartManager` (works with RCLs)
- Config: `MerchelloSettings.ProductViewLocations` (default: `["~/Views/Products/"]`)

### 5.3 Custom Product Properties (Element Types)
Document ProductElementTypeAlias configuration:
- Configure `MerchelloSettings.ProductElementTypeAlias` to link an Element Type
- Element Type tabs/properties render in product workspace after Merchello tabs
- Properties stored as JSON in `ProductRoot.ElementPropertyData`
- Access in Razor via `Model.Content.Value<T>("alias")`

### 5.4 MerchelloProductViewModel
Cover the view model structure:
- `ProductRoot` - The parent product
- `SelectedVariant` - Current variant based on URL
- `AllVariants` - All variant products
- `VariantOptions` - Options that generate variants
- `AddOnOptions` - Options that don't generate variants
- Implements `IContentModel` for Umbraco integration

### 5.5 Rich Text Rendering (TipTap)
```csharp
@inject IRichTextRenderer RichTextRenderer
@Model.ProductRoot.Description.ToTipTapHtml(RichTextRenderer)
```
Handles link/media resolution, block rendering, and HTML cleanup.

### 5.6 Building Product Views
Provide complete Razor view examples showing element property access, variant rendering, add-on options, and image gallery patterns.

---

## 6. Multi-Currency & Tax-Inclusive Display

### 6.1 Currency Selection & Storage
- Customer currency preference stored in cookie (`Constants.Cookies.Currency`, 30-day expiry)
- `StorefrontContextService` manages all currency operations
- Default fallback: `MerchelloSettings.StoreCurrencyCode`

**Automatic Country-Currency Mapping:**
- `CountryCurrencyMappingService` maps country codes to default currencies (80+ mappings)
- When shipping country changes, currency automatically updates
- Examples: "GB" → "GBP", "US" → "USD", "DE" → "EUR", "JP" → "JPY"

### 6.2 Exchange Rate Architecture
**IExchangeRateProvider Interface:**
```csharp
public interface IExchangeRateProvider
{
    ExchangeRateProviderMetadata Metadata { get; }
    Task<ExchangeRateResult> GetRatesAsync(string baseCurrency, CancellationToken ct);
    Task<decimal?> GetRateAsync(string fromCurrency, string toCurrency, CancellationToken ct);
}
```

Built-in: `FrankfurterExchangeRateProvider` (free API via European Central Bank)

**Exchange Rate Cache (`IExchangeRateCache`):**
- Caches rates with configurable TTL
- Falls back to database on cache miss
- Calculates cross-rates when needed
- Returns `ExchangeRateQuote` with rate, timestamp, and source alias for audit

### 6.3 Basket Storage (Critical Architecture)
**THE KEY RULE: Basket amounts NEVER change when currency changes.**

Basket stores in base currency, display is calculated on-the-fly:

| Operation | What Changes | What Stays Same |
|-----------|--------------|-----------------|
| User selects "GBP" | `basket.Currency`, `basket.CurrencySymbol` | `basket.Total`, `basket.SubTotal`, `basket.Tax`, `basket.Shipping` |
| Add item to cart | All amount fields | Currency preference |
| Change quantity | Amounts recalculated in store currency | Currency preference |

### 6.4 Display Calculation
**CRITICAL: Display uses MULTIPLY, Checkout uses DIVIDE**

| Context | Method | Formula | Use For |
|---------|--------|---------|---------|
| **UI Display** | `GetDisplayAmounts()` | `amount × rate` | Product pages, cart UI |
| **Checkout/Payment** | `ConvertToPresentmentCurrency()` | `amount ÷ rate` | Invoice creation |

**Product Display Calculation:**
```
DB Price (NET, Store Currency)
    → Apply Tax: price × (1 + taxRate/100)           [if DisplayPricesIncTax]
    → Convert: result × exchangeRate
    → Round: per currency decimal places
    → Display to Customer
```

### 6.5 StorefrontDisplayContext
```csharp
public record StorefrontDisplayContext(
    string CurrencyCode,              // Customer's display currency ("GBP")
    string CurrencySymbol,            // Symbol for display ("£")
    int DecimalPlaces,                // Rounding precision (2 for most, 0 for JPY)
    decimal ExchangeRate,             // Presentment → Store rate (1.25)
    string StoreCurrencyCode,         // Base store currency ("USD")
    bool DisplayPricesIncTax,         // Global setting from MerchelloSettings
    string TaxCountryCode,            // Customer's country for rate lookup
    string? TaxRegionCode,            // Region for state-specific rates
    bool IsShippingTaxable = true,    // From tax provider
    decimal? ShippingTaxRate = null); // Specific rate or null for proportional
```

Built by `StorefrontContextService.GetDisplayContextAsync()`.

### 6.6 Invoice Multi-Currency Fields
| Field | Description |
|-------|-------------|
| `CurrencyCode` | Presentment (customer) currency, e.g., "GBP" |
| `StoreCurrencyCode` | Store's base currency, e.g., "USD" |
| `PricingExchangeRate` | Locked rate at invoice creation |
| `PricingExchangeRateSource` | Provider alias for audit trail |
| `Total`, `SubTotal`, `Tax`, `Discount` | In presentment currency |
| `TotalInStoreCurrency`, etc. | For reporting aggregation |

---

## 7. Tax System

### 7.1 Product Tax
Tax is calculated using `TaxGroup` entities. Each `ProductRoot` has a `TaxGroupId` linking it to a tax group with `TaxPercentage`.

`ITaxService.GetApplicableRateAsync()` returns the rate for a specific location, considering country/state overrides in `TaxGroupRate`.

### 7.2 Tax Provider Architecture
**ITaxProvider Interface:**

| Category | Methods |
|----------|---------|
| **Configuration** | `Metadata`, `GetConfigurationFieldsAsync()`, `ConfigureAsync()`, `ValidateConfigurationAsync()` |
| **Calculation** | `CalculateOrderTaxAsync()` |
| **Shipping Tax** | `GetShippingTaxRateForLocationAsync()` |

Single active provider at a time. Built-in: `ManualTaxProvider` (uses TaxGroup/TaxGroupRate).

### 7.3 Shipping Tax
Shipping tax is calculated through the active tax provider, NOT hardcoded.

**Decision Flow:**
```
1. Call ITaxProviderManager.IsShippingTaxedForLocationAsync(country, state)
   ├── Returns TRUE  → Shipping IS taxable, continue to get rate
   └── Returns FALSE → Shipping NOT taxable, skip tax calculation

2. Call ITaxProviderManager.GetShippingTaxRateForLocationAsync(country, state)
   ├── Returns 0m      → Shipping explicitly NOT taxable
   ├── Returns decimal → Use this specific rate (regional override or configured tax group)
   └── Returns null    → Use proportional calculation
```

### 7.4 Proportional Calculation (EU/UK VAT)
When rate is `null`, use `ITaxCalculationService.CalculateProportionalShippingTax()`:
```
shippingTax = shippingAmount × (lineItemTax / taxableSubtotal)
```
This ensures VAT compliance for mixed-rate orders (e.g., food at 0% + electronics at 20%).

### 7.5 Shipping Tax Overrides
Create regional overrides via `ITaxService`:
- `GetShippingTaxOverrideAsync()` - Get shipping tax override for region
- `CreateShippingTaxOverrideAsync()` - Create regional override
- `UpdateShippingTaxOverrideAsync()` - Update override
- `DeleteShippingTaxOverrideAsync()` - Delete override

**ManualTaxProvider Priority:**
1. Regional override with `ShippingTaxGroupId = null` → NOT taxed (returns 0m)
2. Regional override with `ShippingTaxGroupId` → Use that group's rate
3. Global shipping tax group configured → Use that group's rate
4. No group configured → Proportional calculation (returns null)

---

## 8. Customers

### 8.1 Customer Model
Document Customer entity with Email, MemberKey (Umbraco link), CustomerTags, AcceptsMarketing, and relationship to Invoices.

### 8.2 Customer Service
Cover `ICustomerService`:
- `GetOrCreateByEmailAsync()` - Get or create customer (with `acceptsMarketing` param, ratchet-up: only false→true)

### 8.3 Customer Segments
Explain segment types:
- **Manual** - Explicit membership via `CustomerSegmentMember`
- **Automated** - Criteria-based (total spend, order count, days since last order, country, tags, date registered)

### 8.4 Customer Metrics
Cover CustomerMetrics read model providing OrderCount, TotalSpend, AverageOrderValue, FirstOrderDate, LastOrderDate.

---

## 9. Discounts

### 9.1 Discount Model
Document Discount entity, DiscountStatus lifecycle (Draft→Scheduled→Active→Expired), and DiscountMethod (Code vs Automatic).

### 9.2 Discount Categories
Explain the three discount categories: AmountOffProducts, BuyXGetY (BOGO), and FreeShipping with their specific configurations.

### 9.3 Target Rules
Document `DiscountTargetRule` for targeting AllProducts, SpecificProducts, Categories, or ProductTypes with inclusion/exclusion support.

### 9.4 Eligibility Rules
Cover `DiscountEligibilityRule` for restricting to AllCustomers, CustomerSegments, or SpecificCustomers.

### 9.5 Buy X Get Y Configuration
Explain `DiscountBuyXGetYConfig` with trigger types, get quantities, selection methods (cheapest/most expensive).

### 9.6 Free Shipping Configuration
Document `DiscountFreeShippingConfig` with country scope, rate limits, and allowed shipping option restrictions.

### 9.7 Discount Engine
Cover `IDiscountEngine` interface:
- `CalculateAsync()` - Calculate discount amounts
- `ValidateCodeAsync()` - Validate discount code
- `ApplyDiscountsAsync()` - Apply discounts to basket

---

## 10. Checkout & Baskets

### 10.1 Basket Model
Document Basket entity with LineItems, currency/totals calculation, shipping address, and Errors collection.

### 10.2 Checkout Service
Cover `ICheckoutService`:
- `CalculateBasketAsync()` - Recalculate totals with tax and shipping
- `ApplyDiscountCodeAsync()` - Apply promotional discount codes
- `RefreshAutomaticDiscountsAsync()` - Check and apply automatic discounts
- `SaveAddressesAsync()` - Save addresses (stores marketing opt-in in `CheckoutSession.AcceptsMarketing`)

### 10.3 Order Grouping
Explain `IOrderGroupingStrategy` interface:
- `Metadata` - Strategy metadata (alias, name, description)
- `GroupItemsAsync(OrderGroupingContext, CancellationToken)` - Group basket items

**OrderGroupingContext Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `Basket` | `Basket` | Current basket |
| `BillingAddress` | `Address` | Billing address |
| `ShippingAddress` | `Address` | Shipping address |
| `CustomerId` | `Guid?` | Customer ID |
| `Products` | `Dictionary<Guid, Product>` | Product lookup |
| `Warehouses` | `Dictionary<Guid, Warehouse>` | Warehouse lookup |
| `SelectedShippingOptions` | `Dictionary<Guid, Guid>` | Group → Option selections |

**Config:** `"Merchello:OrderGroupingStrategy": "vendor-grouping"` (empty = warehouse default)

### 10.4 Warehouse Selection
Priority-based selection:
1. Get from `ProductRootWarehouse` (by priority order)
2. Check `CanServeRegion(country, state)`
3. Check stock (`Stock - ReservedStock >= qty`)
4. Select first passing warehouse

### 10.5 Checkout Flow
```
Basket → GroupItemsAsync() → Groups → Customer selects shipping → Invoice (1) → Orders (/group) → Shipments (1+/order)
```

### 10.6 Checkout Analytics
Document the analytics-agnostic event emitter system for checkout funnel tracking:
- Event emitter API: `window.MerchelloCheckout.on()`, `onAny()`, `off()`
- Available events: `checkout:begin`, `checkout:contact_complete`, `checkout:coupon_applied`, `checkout:coupon_removed`, `checkout:shipping_selected`, `checkout:payment_initiated`, `checkout:purchase`, `checkout:error`
- `CustomScriptUrl` setting in `CheckoutSettings` for loading user's analytics script
- Built-in helper methods: `mapToGA4Item()`, `mapToMetaContents()`, `getContentIds()`, `getTotalQuantity()`

---

## 11. Abandoned Checkout Recovery

### 11.1 Abandoned Checkout Service
`IAbandonedCheckoutService`:
- `TrackCheckoutActivityAsync()` - Track customer checkout progress (resets Recovered/Abandoned → Active for re-abandonment)
- `DetectAbandonedCheckoutsAsync()` - Find abandoned carts (only processes Active status)
- `SendScheduledRecoveryEmailsAsync()` - Send recovery email sequence
- `RestoreBasketFromRecoveryAsync()` - Restore basket from recovery link (validates item availability)
- `MarkAsConvertedAsync()` - Mark checkout as converted (called for Active, Abandoned, or Recovered)
- `GetStatsAsync()` - Get abandonment statistics

### 11.2 Status Lifecycle
```
Active → Abandoned → Recovered → Converted
   ↑         ↓           ↓
   └─────────┴───────────┘  (activity resets to Active, enables re-abandonment)
                         └→ Expired (recovery window closed)
```

---

## 12. Invoices & Orders

### 12.1 Invoice Model
Document Invoice entity with Customer, addresses, currency/exchange rates, Notes, and timeline tracking.

### 12.2 Invoice Source Tracking
`Invoice.Source` tracks order origin for analytics and auditing:

| Source Type | Use Case |
|-------------|----------|
| `web` | Traditional web checkout (default) |
| `ucp` | UCP AI agents (Google Gemini, ChatGPT, etc.) |
| `api` | Direct API integration |
| `pos` | Point of sale |
| `draft` | Admin-created orders |

Use `Constants.InvoiceSources` for well-known values. Query by source:
```csharp
await invoiceService.QueryInvoices(new InvoiceQueryParameters { SourceType = "ucp" });
```

### 12.3 Invoice Service
Cover `IInvoiceService`:
- `CreateOrderFromBasketAsync(basket, session, source?)` - Create invoice and orders from basket with optional source tracking
- `PreviewInvoiceEditAsync()` - Preview edit without saving
- `EditInvoiceAsync()` - Apply edits to invoice
- `CreateDraftOrderAsync()` - Create draft order for manual entry
- `CancelInvoiceAsync()` - Cancel invoice and release stock
- `QueryInvoices(parameters)` - Query with filtering including `SourceType`

### 12.4 Order Model
Cover Order entity, relationship to Invoice (1:N), OrderStatus enum, and LineItems per order.

### 12.5 Order Status Lifecycle
```
Pending → AwaitingStock → ReadyToFulfill → Processing → Shipped/PartiallyShipped → Completed
Any (except Shipped/Completed) → Cancelled | OnHold
```

### 12.6 Line Items
Document LineItem entity, LineItemType enum (Product, Discount, Custom), and ExtendedData dictionary for custom metadata.

---

## 13. Payments

### 13.1 Payment Model
Document Payment entity with PaymentType (Payment, Refund, PartialRefund), TransactionId, IdempotencyKey, and WebhookEventId for deduplication.

### 13.2 Payment Service
Cover `IPaymentService`:
- `CalculatePaymentStatus()` - Calculate invoice payment status (single source of truth)
- `CreatePaymentSessionAsync()` - Create payment session with provider
- `ProcessPaymentAsync()` - Process payment callback
- `RecordPaymentAsync()` - Record payment result
- `ProcessRefundAsync()` - Process refund
- `RecordManualPaymentAsync()` - Record offline payment

### 13.3 Payment Provider Architecture
**IPaymentProvider Interface:**

| Category | Methods |
|----------|---------|
| **Configuration** | `Metadata`, `GetConfigurationFieldsAsync()`, `ConfigureAsync()` |
| **Payment Methods** | `GetAvailablePaymentMethods()` - Returns all methods (Cards, Apple Pay, etc.) |
| **Sessions** | `CreatePaymentSessionAsync()`, `ProcessPaymentAsync()`, `CapturePaymentAsync()` |
| **Express Checkout** | `GetExpressCheckoutClientConfigAsync()`, `ProcessExpressCheckoutAsync()` |
| **Refunds** | `RefundPaymentAsync()` |
| **Webhooks** | `ValidateWebhookAsync()`, `ProcessWebhookAsync()` |
| **Payment Links** | `CreatePaymentLinkAsync()`, `DeactivatePaymentLinkAsync()` |

### 13.4 Integration Types
| Type | Description | Examples |
|------|-------------|----------|
| `Redirect` | User redirected to external page | Stripe Checkout |
| `HostedFields` | Inline card fields via SDK | Braintree Cards, Stripe Elements |
| `Widget` | Provider's embedded widget | Apple Pay, Google Pay, PayPal |
| `DirectForm` | Simple form fields (backoffice) | Manual payments |

### 13.5 Risk Level
Backend calculates `RiskLevel` enum: `high` | `medium` | `low` | `minimal`

---

## 14. Shipping

### 14.1 Shipping Model
Document ShippingOption entity with ShippingCost, ShippingWeightTier, and ShippingOptionCountry.

### 14.2 Shipping Service
Cover `IShippingService`:
- `GetShippingOptionsForBasket()` - Get available options for basket
- `GetRequiredWarehouses()` - Determine warehouses needed
- `GetShippingOptionsForWarehouseAsync()` - Options for specific warehouse
- `GetFulfillmentOptionsForProductAsync()` - Fulfillment options for product
- `GetDefaultFulfillingWarehouseAsync()` - Get default warehouse for product

### 14.3 Shipping Provider Architecture
**IShippingProvider Interface:**

| Category | Methods |
|----------|---------|
| **Configuration** | `Metadata`, `GetConfigurationFieldsAsync()`, `GetMethodConfigFieldsAsync()`, `ConfigureAsync()` |
| **Availability** | `IsAvailableFor()` |
| **Rates** | `GetRatesAsync()`, `GetRatesForServicesAsync()`, `GetSupportedServiceTypesAsync()` |
| **Delivery Dates** | `GetAvailableDeliveryDatesAsync()`, `CalculateDeliveryDateSurchargeAsync()`, `ValidateDeliveryDateAsync()` |

Built-in: `FlatRateShippingProvider`

**Resolution Priority:** State > Country > Universal(`*`) > FixedCost

### 14.4 Service Regions
| Config | Meaning |
|--------|---------|
| No regions | Serves everywhere |
| `US, null, false` | Serves all USA |
| `US, HI, true` | Excludes Hawaii |
| `CA, QC, false` | Only serves Quebec |

State-specific overrides country-level rules.

---

## 15. Inventory & Warehouses

### 15.1 Warehouse Model
Document Warehouse entity with Supplier relationship, Code, Address, and ServiceRegions collection.

### 15.2 Product-Warehouse Relationships
- `ProductRootWarehouse` (priority ordering)
- `ProductWarehouse` (Stock, ReservedStock, TrackStock, RowVersion per variant)
- `ProductWarehousePriceOverride`

### 15.3 Stock Management
- `Stock` - Physical stock count
- `ReservedStock` - Stock reserved for pending orders
- `AvailableStock` - Computed: Stock - ReservedStock
- `TrackStock` - Flag to enable/disable tracking
- `StockStatus` enum: InStock/LowStock/OutOfStock/Untracked

### 15.4 Inventory Service
Cover `IInventoryService`:
- `ReserveAsync()` - Reserve stock on order creation
- `AllocateAsync()` - Allocate stock on shipment (Stock -= qty, Reserved -= qty)
- `ReleaseAsync()` - Release reserved stock on cancellation

**Stock Flow (TrackStock=true):**
```
Create Order → Check (Stock - Reserved >= qty) → Reserve (Reserved += qty)
Ship         → Allocate (Stock -= qty, Reserved -= qty)
Cancel       → Release (Reserved -= qty)
```

`TrackStock = false` for digital products, services, or drop-ship items.

### 15.5 Warehouse Service
Cover `IWarehouseService`:
- `AdjustStockAsync()` - Manual stock corrections
- `TransferStockAsync()` - Transfer between warehouses

---

## 16. Shipments

### 16.1 Shipment Model
Document Shipment entity with Order relationship, LineItems subset, and tracking information.

### 16.2 Shipment Service
Cover `IShipmentService`:
- `CreateShipmentAsync()` - Create single shipment
- `CreateShipmentsFromOrderAsync()` - Create batch shipments
- `UpdateShipmentAsync()` - Update shipment details
- `UpdateShipmentStatusAsync()` - Update status
- `DeleteShipmentAsync()` - Delete and release inventory
- `GetFulfillmentSummaryAsync()` - Get fulfillment summary

### 16.3 Tracking
Document TrackingNumber, TrackingUrl, Carrier, and ActualDeliveryDate tracking.

---

## 17. Statements

### 17.1 Statement Service
Cover `IStatementService`:
- `GetOutstandingInvoicesForCustomerAsync()` - Outstanding invoices
- `GetOutstandingBalanceAsync()` - Customer balance
- `GetOutstandingInvoicesPagedAsync()` - Paged outstanding invoices
- `GenerateStatementPdfAsync()` - Generate PDF statement

---

## 18. Notifications & Events

### 18.1 Notification Pattern
Hook into CRUD for validation/modification/integration using `INotificationAsyncHandler<T>`:

```csharp
// Before (can cancel)
class Validator : INotificationAsyncHandler<OrderCreatingNotification>
{
    public async Task HandleAsync(OrderCreatingNotification notification, CancellationToken ct)
    {
        notification.CancelOperation("Reason for cancellation");
    }
}

// After (react)
class Syncer : INotificationAsyncHandler<OrderCreatedNotification>
{
    public async Task HandleAsync(OrderCreatedNotification notification, CancellationToken ct)
    {
        await externalService.SyncOrderAsync(notification.Entity);
    }
}
```

### 18.2 Base Classes
All notifications inherit from one of three base classes:

| Base Class | When to Use | Can Cancel? | Has Entity? |
|------------|-------------|-------------|-------------|
| `MerchelloNotification` | After events (read-only observation) | No | No |
| `MerchelloCancelableNotification<T>` | Before events with entity modification | Yes | Yes |
| `MerchelloSimpleCancelableNotification` | Before events without entity (e.g., stock operations) | Yes | No |

**State Dictionary:** All notifications include a `State` dictionary for sharing data between handlers.

### 18.3 Handler Priority
| Priority | Purpose | Example |
|----------|---------|---------|
| 100 | Validation (can cancel) | Stock check, fraud detection |
| 500 | Modification | Adjust values before save |
| 1000 | Default | Standard handlers |
| 2000 | External sync | CRM sync, webhooks, emails |

```csharp
[NotificationHandlerPriority(100)]
public class StockValidator : INotificationAsyncHandler<OrderCreatingNotification> { }

[NotificationHandlerPriority(2000)]
public class CrmSyncer : INotificationAsyncHandler<OrderCreatedNotification> { }
```

### 18.4 Available Notifications by Domain

**Standard CRUD Pattern:** Creating✓/Created, Saving✓/Saved, Deleting✓/Deleted (✓ = cancelable)

| Domain | Events | Service |
|--------|--------|---------|
| **Basket** | Clearing✓/Cleared, ItemAdding✓/Added, ItemRemoving✓/Removed, QuantityChanging✓/Changed | CheckoutService |
| **BasketCurrency** | Changing✓/Changed | CheckoutService |
| **Order** | Creating✓/Created, Saving✓/Saved, StatusChanging✓/Changed | InvoiceService |
| **Invoice** | Saving✓/Saved, Deleting✓/Deleted, Cancelling✓/Cancelled | InvoiceService |
| **Payment** | Creating✓/Created, Refunding✓/Refunded | PaymentService |
| **Shipment** | Creating✓/Created, Saving✓/Saved, StatusChanging✓/Changed | ShipmentService |
| **Product** | All 6 | ProductService |
| **ProductOption** | Creating✓/Created, Deleting✓/Deleted | ProductService |
| **Customer** | All 6 | CustomerService |
| **CustomerSegment** | All 6 | CustomerSegmentService |
| **Discount** | All 6 + StatusChanging✓/Changed | DiscountService |
| **Supplier** | All 6 | SupplierService |
| **Warehouse** | All 6 | WarehouseService |
| **TaxGroup** | All 6 | TaxService |
| **ShippingTaxOverride** | All 6 | TaxService |
| **ShippingOption** | All 6 | ShippingService |

**Inventory Events** (InventoryService/WarehouseService):
- StockReserving✓/Reserved, StockReleasing✓/Released, StockAllocating✓/Allocated, StockAdjusted, LowStock

**Checkout Events** (CheckoutService):
- AddressesChanging✓/Changed, DiscountCodeApplying✓/Applied/Removed, ShippingSelectionChanging✓/Changed

**Abandoned Checkout Events** (AbandonedCheckoutService):
- AbandonedFirst, AbandonedReminder, AbandonedFinal, Recovered, RecoveryConverted

**Reminder Events** (InvoiceReminderJob):
- InvoiceReminder, InvoiceOverdue

**Exchange Rate Events** (ExchangeRateRefreshJob):
- `ExchangeRatesRefreshedNotification` - Rates successfully fetched
- `ExchangeRateFetchFailedNotification` - Fetch failed (includes `ConsecutiveFailureCount` for circuit-breaker patterns)

**Digital Product Events** (DigitalProductPaymentHandler):
- DigitalProductDelivered - Download links ready for delivery (triggers email/webhook)

**Protocol Events** (AgentAuthenticationMiddleware):
- AgentAuthenticating✓/Authenticated - External agent authentication
- ProtocolSessionCreating✓/Created - Protocol checkout session lifecycle
- ProtocolSessionUpdating✓/Updated
- ProtocolSessionCompleting✓/Completed

**Special Events:**
- `InvoiceAggregateChangedNotification` - Fires on any Invoice/child change
- `MerchelloCacheRefresherNotification` - Distributed cache invalidation

---

## 19. Email Integration

### 19.1 Email System Overview
Automated email via notifications, configured in backoffice Email Builder.

**Flow:**
```
Notification → EmailNotificationHandler (2000) → IEmailConfigurationService.GetEnabledByTopicAsync()
    → IEmailService.QueueDeliveryAsync() → OutboundDeliveryJob → Umbraco IEmailSender
```

### 19.2 Email Topics
- Orders: created, status_changed, cancelled
- Payments: created, refunded
- Shipping: shipment.created, shipment.updated
- Customers: created, updated, password_reset
- Checkout: abandoned, recovered, converted
- Inventory: low_stock
- Digital: delivered

### 19.3 Email Tokens
`{{order.customerEmail}}`, `{{order.billingAddress.name}}`, `{{store.name}}`, `{{store.websiteUrl}}`

### 19.4 Email Configuration
```json
{
  "Merchello": {
    "Email": {
      "Enabled": true,
      "TemplateViewLocations": ["/Views/Emails/{0}.cshtml"],
      "DefaultFromAddress": null,
      "MaxRetries": 3,
      "RetryDelaysSeconds": [60, 300, 900],
      "DeliveryRetentionDays": 30
    }
  }
}
```

---

## 20. Webhooks

### 20.1 Webhook System Overview
Outbound webhook system. Shares infrastructure with Email via `OutboundDelivery`.

**Flow:**
```
Notification → WebhookNotificationHandler (2000) → IWebhookService.QueueDeliveryAsync()
    → WebhookDispatcher → HTTP POST → OutboundDelivery → OutboundDeliveryJob (retry)
```

### 20.2 Webhook Topics
- Orders: created, updated, status_changed, cancelled
- Invoices: created, paid, refunded
- Products: created, updated, deleted
- Customers: created, updated, deleted
- Shipments: created, updated
- Discounts: created, updated, deleted
- Inventory: adjusted, low_stock, reserved, allocated
- Checkout: abandoned, recovered, converted
- Baskets: created, updated
- Digital: delivered

### 20.3 Authentication Types
`HmacSha256` (default, `X-Merchello-Hmac-SHA256`), `HmacSha512`, `BearerToken`, `ApiKey`, `BasicAuth`, `None`

### 20.4 Payload Format
```json
{
  "id": "...",
  "topic": "order.created",
  "timestamp": "...",
  "api_version": "2024-01",
  "data": {}
}
```

### 20.5 Webhook Configuration
```json
{
  "Merchello": {
    "Webhooks": {
      "Enabled": true,
      "MaxRetries": 5,
      "RetryDelaysSeconds": [60, 300, 900, 3600, 14400],
      "DeliveryIntervalSeconds": 10,
      "DefaultTimeoutSeconds": 30,
      "MaxPayloadSizeBytes": 1000000,
      "DeliveryLogRetentionDays": 30
    }
  }
}
```

---

## 21. Commerce Protocol Adapters (UCP)

### 21.1 Protocol Adapter Architecture
Protocol adapters enable Merchello to expose checkout and order capabilities to external AI agents and platforms using standardized protocols like UCP (Universal Commerce Protocol).

**ICommerceProtocolAdapter Interface:**

| Category | Methods |
|----------|---------|
| **Identity** | `Alias`, `Metadata` |
| **Discovery** | `GetManifestAsync()`, `GetNegotiatedManifestAsync()` |
| **Checkout** | `GetSessionStateAsync()`, `UpdateSessionAsync()`, `CompleteSessionAsync()` |
| **Orders** | `GetOrderAsync()`, `QueryOrdersAsync()` |

### 21.2 Agent Authentication
`AgentAuthenticationMiddleware`:
- Validates `UCP-Agent` header (RFC 8941 Dictionary Structured Field)
- Checks agent against allowed list (`Merchello:Protocols:Ucp:AllowedAgents`)
- Publishes `AgentAuthenticatingNotification` (cancelable) and `AgentAuthenticatedNotification`
- Stores `AgentIdentity` in `HttpContext.Items` for controllers

### 21.3 Webhook Signing
`IWebhookSigner`, `ISigningKeyStore`:
- ES256 (ECDSA P-256) signatures for webhook payloads
- RFC 7797 detached JWT format
- Automatic key rotation support
- Signing keys persisted in `merchelloSigningKeys` table with in-memory caching
- Supports multi-instance deployments (keys survive restarts)

### 21.4 Protocol Configuration
```json
{
  "Merchello": {
    "Protocols": {
      "Enabled": true,
      "ManifestCacheDurationMinutes": 60,
      "RequireHttps": true,
      "Ucp": {
        "Enabled": false,
        "RequireAuthentication": true,
        "AllowedAgents": ["*"],
        "Capabilities": {
          "Checkout": true,
          "Order": true,
          "IdentityLinking": false
        }
      }
    }
  }
}
```

---

## 22. Background Jobs

| Job | Purpose |
|-----|---------|
| `DiscountStatusJob` | Transitions discounts: Scheduled → Active → Expired |
| `OutboundDeliveryJob` | Processes webhook and email retry queue |
| `AbandonedCheckoutDetectionJob` | Detects abandoned carts, sends email sequence, expires old checkouts |
| `InvoiceReminderJob` | Sends payment reminders and overdue notices |

---

## 23. Caching

### 23.1 Cache Service
`ICacheService` wraps Umbraco `AppCaches` (distributed):

```csharp
GetOrCreateAsync(key, factory, ttl, tags)
RemoveAsync(key)
RemoveByTagAsync(tag)
distributedCache.ClearMerchelloCache("prefix")
```

### 23.2 Cache Prefixes
- `merchello:exchange-rates:*`
- `merchello:locality:*`
- `merchello:shipping:*`

### 23.3 Deduplication
- `Payment.IdempotencyKey` - Prevents duplicate payment processing
- `Payment.WebhookEventId` - Prevents duplicate webhook processing

---

## 24. Umbraco Integration

### 24.1 Property Editors Overview
Introduce the 5 Merchello property editors for picking Merchello content from Umbraco content pages.

### 24.2 Collection Picker
Document Merchello.PropertyEditorUi.CollectionPicker with maxItems config, storing comma-separated GUIDs, returning IEnumerable<ProductCollection>.

### 24.3 Product Picker
Document Merchello.PropertyEditorUi.ProductPicker with filtering by collection, product type, or filter values, returning IEnumerable<Product>.

### 24.4 Product Type Picker
Document Merchello.PropertyEditorUi.ProductTypePicker for selecting product types, returning IEnumerable<ProductType>.

### 24.5 Filter Group Picker
Document Merchello.PropertyEditorUi.FilterGroupPicker for selecting filter groups, returning IEnumerable<ProductFilterGroup>.

### 24.6 Filter Value Picker
Document Merchello.PropertyEditorUi.FilterValuePicker with optional filterGroupId restriction, returning IEnumerable<ProductFilter>.

### 24.7 Value Converters
Explain how value converters work, batch loading pattern with IServiceScopeFactory, and order preservation for multi-select.

### 24.8 Template Usage Examples
Show Razor examples accessing picked products/collections, handling null/deleted items, and single vs multi-select usage patterns.

---

## 25. Reporting

### 25.1 Reporting Service
Document `IReportingService`:
- `GetSalesBreakdownAsync()` - TotalCost, GrossProfit, GrossProfitMargin
- `GetBestSellersAsync()` - Best selling products
- `GetOrderStatsAsync()` - Order statistics
- `GetDashboardStatsAsync()` - Dashboard KPIs
- `GetOrdersForExportAsync()` - Export orders

### 25.2 Cost Tracking
`LineItem.Cost` captured at order creation; add-on costs from `ExtendedData["CostAdjustment"]`

---

## 26. API Reference

### 26.1 Storefront API (`/api/merchello/storefront`)
Pre-checkout endpoints for basket, location, and availability.

**Basket:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/basket/add` | POST | Add item to basket |
| `/basket` | GET | Get basket |
| `/basket/count` | GET | Get basket item count |
| `/basket/update` | POST | Update item quantity |
| `/basket/{lineItemId}` | DELETE | Remove item |
| `/basket/availability` | GET | Check basket availability |
| `/basket/estimated-shipping` | GET | Get estimated shipping |

**Shipping & Location:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/shipping/countries` | GET | Get shipping countries |
| `/shipping/country` | GET/POST | Get/set shipping country |
| `/shipping/countries/{code}/regions` | GET | Get regions for country |

**Currency:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/currency` | GET/POST | Get/set display currency |

**Products:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/products/{id}/availability` | GET | Check product availability |

### 26.2 Checkout API (`/api/merchello/checkout`)
Checkout flow endpoints for basket, addresses, shipping, discounts, and payments.

### 26.3 Downloads API (`/api/merchello/downloads`)
Secure file download endpoints for digital products.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/{token}` | GET | None (token-based) | Download file using secure token |
| `/customer` | GET | Required | Get customer's download links |
| `/invoice/{invoiceId}` | GET | Required | Get download links for invoice |

### 26.4 Webhook API
**Payment Webhooks (public):**
`POST /umbraco/merchello/webhooks/payments/{providerAlias}`

**Outbound Webhook Management (`/api/v1/webhooks`):**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET/POST | List/create subscriptions |
| `/{id}` | GET/PUT/DELETE | Get/update/delete subscription |
| `/{id}/test` | POST | Send test webhook |
| `/topics` | GET | Get available topics |

### 26.5 Protocol Discovery API (`/.well-known`)
Public endpoints for protocol discovery by external agents.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.well-known/{protocol}` | GET | Get protocol manifest (e.g., `/.well-known/ucp`) |
| `/.well-known/oauth-authorization-server` | GET | OAuth 2.0 metadata (when Identity Linking enabled) |

---

## 27. Extending Merchello

### 27.1 Custom Payment Provider
Provide complete guide to implementing IPaymentProvider with configuration fields and payment methods.

### 27.2 Custom Shipping Provider
Provide complete guide to implementing IShippingProvider with rate calculation and currency conversion.

### 27.3 Custom Tax Provider
Cover ITaxProvider implementation with CalculateOrderTaxAsync and shipping tax rate methods.

### 27.4 Custom Exchange Rate Provider
Cover IExchangeRateProvider implementation with GetRatesAsync and GetRateAsync methods.

### 27.5 Custom Order Grouping Strategy
Explain IOrderGroupingStrategy implementation with GroupItemsAsync for vendor grouping, category grouping, etc.

### 27.6 Custom Notification Handlers
Cover implementing INotificationAsyncHandler<T> with NotificationHandlerPriorityAttribute. Include examples:
- Sending order confirmation emails (OrderCreated)
- Syncing to external systems (InvoiceSaved)
- Validating before saves (ProductSaving with CancelOperation)
- Logging status changes (OrderStatusChanged)
- Low stock alerts (LowStockNotification)

### 27.7 Custom Order Status Handler
Document IOrderStatusHandler for CanTransitionAsync, OnStatusChangingAsync, and OnStatusChangedAsync hooks.

### 27.8 Custom Commerce Protocol Adapter
Cover implementing ICommerceProtocolAdapter for integrating with external platforms.

---

## 28. Backoffice Development

### 28.1 UI Architecture
Explain Lit web components, Vite build system, TypeScript patterns, and feature-based folder structure.

### 28.2 Creating Property Editor UIs
Cover property editor pattern with UmbFormControlMixin, UmbChangeEvent, and manifest registration.

### 28.3 Picker Modals
Document modal token pattern, UmbModalBaseElement, and single vs multi-select with drag reordering.

### 28.4 API Integration
Cover MerchelloApi layer pattern with error handling and loading states.

### 28.5 Manifest Registration
Document propertyEditorUi manifests, modal manifests, and bundle.manifests.ts aggregation.

---

## 29. Troubleshooting

### 29.1 Common Issues
Cover common issues: stock not updating, shipping not appearing, payment failures, discount not applying.

### 29.2 Debugging
Document logging configuration and notification tracing for troubleshooting.
