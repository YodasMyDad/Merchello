# Merchello Architecture

An Enterprise (Shopify equivalent) ecommerce plugin for Umbraco v17+ (NuGet), where the Merchello project is a NuGet package with admin and Shopify-style integrated checkout. The Merchello.Site is an example site showing users how to leverage the package to build an ecommerce store making using of our API's and controllers to go inline with our ethos.

**Ethos: making enterprise ecommerce simple.**

---

## 1. Overview & Principles

### Core Principles
- **Modular** - `ExtensionManager` for plugins (ShippingProviders, PaymentProviders, TaxProviders, OrderGroupingStrategies)
- **Services** - Feature-grouped, DI, parameter models (RORO pattern)
- **Factories** - All key domain objects created via factories for consistency and thread safety
- **Multi-warehouse** - Variant-level stock with priority-based warehouse selection
- **Single Source of Truth** - All business logic and calculations are centralized in services. Key calculations (tax, totals, discounts, payment status, stock) must never be duplicated—always call the designated service method or provider. This ensures consistency, auditability, and maintainability across the entire system.

### Architecture Layers

```
CONTROLLERS → Thin: HTTP only, no logic, no DbContext
     ↓
SERVICES    → All business logic, all DB access, CrudResult<T>, RORO params
     ↓
FACTORIES   → All object creation, stateless singletons
```

**Rules:**
```csharp
// Bad: Logic in controller          // Good: Delegate to service
payments.Where().Sum()               paymentService.CalculatePaymentStatusAsync(id)

// Bad: Direct instantiation         // Good: Use factory
new Invoice{Id=Guid.NewGuid()}       invoiceFactory.CreateFromBasket(basket,num,addr)
```

### Module/Folder Structure

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

**Modules:** Accounting, Checkout, Customers, Discounts, Email, Products, Shipping, Payments, Suppliers, Warehouses, Locality, Notifications, Stores, Webhooks

### Design Rules
- DbContext only in services, never in controllers
- All service methods use RORO (Request/Response as Objects) parameters
- Return `CrudResult<T>` for operations that can fail
- Always use `async/await` with `CancellationToken`
- Use factories for entity creation
- Only add DB tables when absolutely necessary

---

## 2. Core Services by Domain

### 2.1 Products

**IProductService:**
- `RegenerateVariants()` - Regenerate variants from options
- `PreviewAddonPriceAsync()` - Preview add-on pricing

**Stock Status Calculation:**
Backend calculates `StockStatus` enum: `InStock` | `LowStock` | `OutOfStock` | `Untracked`

**Model Hierarchy:**
- `ProductRoot` - Parent with options, TaxGroupId, DefaultPackageConfigurations
- `Product` - Variant with specific SKU, price, stock per warehouse, PackageConfigurations, HsCode

**Front-End Product Routing:**

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

**Key Components:**

| Component | Purpose |
|-----------|---------|
| `ProductContentFinder` | Intercepts product URLs after Umbraco content finder |
| `MerchelloPublishedProduct` | Virtual `IPublishedContent` wrapper for routing |
| `MerchelloProductController` | Renders views by `ProductRoot.ViewAlias` |
| `MerchelloProductViewModel` | View model with ProductRoot, SelectedVariant, AllVariants, pricing, stock |

**View Selection:**
- `ProductRoot.ViewAlias` stores view name (e.g., `"Gallery"`)
- Resolves to `~/Views/Products/{ViewAlias}.cshtml`
- Views discovered via `ApplicationPartManager` (works with RCLs)
- Config: `MerchelloSettings.ProductViewLocations` (default: `["~/Views/Products/"]`)

**Element Type Properties (Optional):**
- Configure `MerchelloSettings.ProductElementTypeAlias` to link an Element Type
- Element Type tabs/properties render in product workspace after Merchello tabs
- Properties stored as JSON in `ProductRoot.ElementPropertyData`
- Access in Razor via `Model.Content.Value<T>("alias")`

**Rich Text Rendering (TipTap):**
```csharp
@inject IRichTextRenderer RichTextRenderer
@Model.ProductRoot.Description.ToTipTapHtml(RichTextRenderer)
```
Handles link/media resolution, block rendering, and HTML cleanup.

### 2.2 Inventory & Warehouses

**IInventoryService:**
- `ReserveAsync()` - Reserve stock on order creation
- `AllocateAsync()` - Allocate stock on shipment (Stock -= qty, Reserved -= qty)
- `ReleaseAsync()` - Release reserved stock on cancellation

**IWarehouseService:**
- `AdjustStockAsync()` - Manual stock corrections
- `TransferStockAsync()` - Transfer between warehouses

**Stock Flow (TrackStock=true):**
```
Create Order → Check (Stock - Reserved >= qty) → Reserve (Reserved += qty)
Ship         → Allocate (Stock -= qty, Reserved -= qty)
Cancel       → Release (Reserved -= qty)
```

`TrackStock = false` for digital products, services, or drop-ship items.

### 2.3 Checkout & Baskets

**ICheckoutService:**
- `CalculateBasketAsync()` - Recalculate totals with tax and shipping
- `ApplyDiscountCodeAsync()` - Apply promotional discount codes
- `RefreshAutomaticDiscountsAsync()` - Check and apply automatic discounts
- `SaveAddressesAsync()` - Save addresses (stores marketing opt-in in `CheckoutSession.AcceptsMarketing`)

**IAbandonedCheckoutService:**
- `TrackCheckoutActivityAsync()` - Track customer checkout progress
- `DetectAbandonedCheckoutsAsync()` - Find abandoned carts
- `SendScheduledRecoveryEmailsAsync()` - Send recovery email sequence
- `RestoreBasketFromRecoveryAsync()` - Restore basket from recovery link
- `MarkAsConvertedAsync()` - Mark recovered checkout as converted
- `GetStatsAsync()` - Get abandonment statistics

### 2.4 Invoices & Orders

**IInvoiceService:**
- `CreateOrderFromBasketAsync()` - Create invoice and orders from basket
- `PreviewInvoiceEditAsync()` - Preview edit without saving
- `EditInvoiceAsync()` - Apply edits to invoice
- `CreateDraftOrderAsync()` - Create draft order for manual entry
- `CancelInvoiceAsync()` - Cancel invoice and release stock

**ILineItemService:**
- `CalculateFromLineItems()` - Calculate totals from line items
- `AddDiscountLineItem()` - Add discount line item

**Calculation Flow:**
```
CheckoutService.CalculateBasketAsync()
    → LineItemService.CalculateFromLineItems()
        → TaxCalculationService.CalculateOrderTax()
```

**Shared Calculation Logic:**
| Calculation | Method |
|-------------|--------|
| Subtotal | `productItems.Sum(li => Amount * Quantity)` |
| Discounts | Before-tax, after-tax, linked, unlinked |
| Tax pro-rating | `ITaxCalculationService.CalculateOrderTax()` |
| Rounding | `ICurrencyService.Round()` |

**Difference:** Basket uses `DefaultTaxRate` (fast preview); Invoice uses stored `TaxRate` + provider (accurate final).

**Order Lifecycle:**
```
Pending → AwaitingStock → ReadyToFulfill → Processing → Shipped/PartiallyShipped → Completed
Any (except Shipped/Completed) → Cancelled | OnHold
```

### 2.5 Shipping & Fulfillment

**IShippingService:**
- `GetShippingOptionsForBasket()` - Get available options for basket
- `GetRequiredWarehouses()` - Determine warehouses needed
- `GetShippingOptionsForWarehouseAsync()` - Options for specific warehouse
- `GetFulfillmentOptionsForProductAsync()` - Fulfillment options for product
- `GetDefaultFulfillingWarehouseAsync()` - Get default warehouse for product
- `GetShippingOptionsForProductAsync()` - Options available for product

**IShippingQuoteService:**
- `GetQuotesAsync()` - Get shipping rate quotes

**IShipmentService:**
- `CreateShipmentAsync()` - Create single shipment
- `CreateShipmentsFromOrderAsync()` - Create batch shipments
- `UpdateShipmentAsync()` - Update shipment details
- `UpdateShipmentStatusAsync()` - Update status
- `DeleteShipmentAsync()` - Delete and release inventory
- `GetFulfillmentSummaryAsync()` - Get fulfillment summary

**IShippingCostResolver:**
- `ResolveBaseCost()` - Resolve base shipping cost
- `GetTotalShippingCost()` - Get total cost

**Resolution Priority:** State > Country > Universal(`*`) > FixedCost

### 2.6 Payments

**IPaymentService:**
- `CalculatePaymentStatus()` - Calculate invoice payment status (single source of truth)
- `CreatePaymentSessionAsync()` - Create payment session with provider
- `ProcessPaymentAsync()` - Process payment callback
- `RecordPaymentAsync()` - Record payment result
- `ProcessRefundAsync()` - Process refund
- `RecordManualPaymentAsync()` - Record offline payment

**Risk Level:** Backend calculates `RiskLevel` enum: `high` | `medium` | `low` | `minimal`

### 2.7 Tax

**ITaxService:**
- `GetTaxGroups()` - Get all tax groups
- `GetApplicableRateAsync()` - Get applicable rate for location
- `GetShippingTaxOverrideAsync()` - Get shipping tax override for region
- `CreateShippingTaxOverrideAsync()` - Create regional override
- `UpdateShippingTaxOverrideAsync()` - Update override
- `DeleteShippingTaxOverrideAsync()` - Delete override

**ITaxProviderManager:**
- `GetActiveProviderAsync()` - Get active tax provider
- `IsShippingTaxedForLocationAsync()` - Check if shipping is taxable
- `GetShippingTaxRateForLocationAsync()` - Get shipping tax rate

See [Section 3: Tax System](#3-tax-system) for detailed shipping tax documentation.

### 2.8 Customers & Segments

**ICustomerService:**
- `GetOrCreateByEmailAsync()` - Get or create customer (with `acceptsMarketing` param, ratchet-up: only false→true)

**ICustomerSegmentService:**
- `IsCustomerInSegmentAsync()` - Check segment membership

**Segment Types:**
- **Manual** - Explicit membership via `CustomerSegmentMember`
- **Automated** - Criteria-based (total spend, order count, days since last order, country, tags, date registered)

### 2.9 Discounts

**IDiscountService:**
- `RecordUsageAsync()` - Record discount usage

**IDiscountEngine:**
- `CalculateAsync()` - Calculate discount amounts
- `ValidateCodeAsync()` - Validate discount code
- `ApplyDiscountsAsync()` - Apply discounts to basket

**IBuyXGetYCalculator:**
- `Calculate()` - Calculate BOGO discounts

**IInvoiceService:**
- `PreviewDiscountAsync()` - Preview discount application

### 2.10 Reporting

**IReportingService:**
- `GetSalesBreakdownAsync()` - TotalCost, GrossProfit, GrossProfitMargin
- `GetBestSellersAsync()` - Best selling products
- `GetOrderStatsAsync()` - Order statistics
- `GetDashboardStatsAsync()` - Dashboard KPIs
- `GetOrdersForExportAsync()` - Export orders

**Cost Tracking:** `LineItem.Cost` captured at order creation; add-on costs from `ExtendedData["CostAdjustment"]`

### 2.11 Statements

**IStatementService:**
- `GetOutstandingInvoicesForCustomerAsync()` - Outstanding invoices
- `GetOutstandingBalanceAsync()` - Customer balance
- `GetOutstandingInvoicesPagedAsync()` - Paged outstanding invoices
- `GenerateStatementPdfAsync()` - Generate PDF statement

---

## 3. Tax System

### 3.1 Product Tax

Tax is calculated using `TaxGroup` entities. Each `ProductRoot` has a `TaxGroupId` linking it to a tax group with `TaxPercentage`.

**ITaxService.GetApplicableRateAsync()** returns the rate for a specific location, considering country/state overrides in `TaxGroupRate`.

### 3.2 Shipping Tax

Shipping tax is calculated through the active tax provider, NOT hardcoded. The system supports:
- Regional overrides (specific countries/states)
- Global default rates
- Proportional calculation (EU/UK VAT compliant)

#### Decision Flow: Is Shipping Taxable?

```
1. Call ITaxProviderManager.IsShippingTaxedForLocationAsync(country, state)
   ├── Returns TRUE  → Shipping IS taxable, continue to get rate
   └── Returns FALSE → Shipping NOT taxable, skip tax calculation
```

#### Getting the Tax Rate

```
2. Call ITaxProviderManager.GetShippingTaxRateForLocationAsync(country, state)
   ├── Returns 0m      → Shipping explicitly NOT taxable
   ├── Returns decimal → Use this specific rate (regional override or configured tax group)
   └── Returns null    → Use proportional calculation (weighted average of line item rates)
```

#### Return Value Semantics

| Return Value | Meaning | Action |
|--------------|---------|--------|
| `0m` | Shipping explicitly NOT taxable | No shipping tax |
| `decimal > 0` | Specific rate from override or tax group | Apply this rate |
| `null` | No specific rate configured | Use proportional calculation |

#### Proportional Calculation (EU/UK VAT)

When rate is `null`, use `ITaxCalculationService.CalculateProportionalShippingTax()`:

```
shippingTax = shippingAmount × (lineItemTax / taxableSubtotal)
```

This ensures VAT compliance for mixed-rate orders (e.g., food at 0% + electronics at 20%).

**Single Implementation:** Always use `CalculateProportionalShippingTax()` - never duplicate this logic.

#### Entry Points (Where These Methods MUST Be Called)

| Entry Point | Service | Purpose |
|-------------|---------|---------|
| `CalculateBasketAsync()` | CheckoutService | Basket calculations during checkout |
| `GetDisplayContextAsync()` | StorefrontContextService | Tax-inclusive price display |
| `CalculateShippingTaxAsync()` | InvoiceService (internal) | Invoice total recalculation |

#### ManualTaxProvider Priority

1. Regional override with `ShippingTaxGroupId = null` → NOT taxed (returns 0m)
2. Regional override with `ShippingTaxGroupId` → Use that group's rate
3. Global shipping tax group configured → Use that group's rate
4. No group configured → Proportional calculation (returns null)

#### Rules

- **NEVER** hardcode shipping tax rates
- **NEVER** calculate shipping tax without consulting the provider methods
- **NEVER** assume shipping is always taxable or always at a fixed rate
- **ALWAYS** use `CalculateProportionalShippingTax()` for proportional - don't duplicate logic

---

## 4. Provider Systems

### 4.1 Extension Manager

`ExtensionManager` scans assemblies to discover and instantiate provider implementations.

```csharp
public class ExtensionManager(IServiceProvider serviceProvider)
{
    public Type GetImplementation<T>(bool useCaching = false);
    public IEnumerable<Type> GetImplementations<T>(bool useCaching = false);
    public T? GetInstance<T>(bool useCaching = false);
    public IEnumerable<T?> GetInstances<T>(bool useCaching = false);
}
```

### 4.2 Shipping Providers

**IShippingProvider Interface:**

| Category | Methods |
|----------|---------|
| **Configuration** | `Metadata`, `GetConfigurationFieldsAsync()`, `GetMethodConfigFieldsAsync()`, `ConfigureAsync()` |
| **Availability** | `IsAvailableFor()` |
| **Rates** | `GetRatesAsync()`, `GetRatesForServicesAsync()`, `GetSupportedServiceTypesAsync()` |
| **Delivery Dates** | `GetAvailableDeliveryDatesAsync()`, `CalculateDeliveryDateSurchargeAsync()`, `ValidateDeliveryDateAsync()` |

**Built-in:** `FlatRateShippingProvider`

**Currency Conversion:** Providers use `IExchangeRateCache` for currency conversion.

### 4.3 Payment Providers

**IPaymentProvider Interface:**

| Category | Methods |
|----------|---------|
| **Configuration** | `Metadata`, `GetConfigurationFieldsAsync()`, `ConfigureAsync()` |
| **Payment Methods** | `GetAvailablePaymentMethods()` - Returns all methods (Cards, Apple Pay, etc.) |
| **Sessions** | `CreatePaymentSessionAsync()`, `ProcessPaymentAsync()`, `CapturePaymentAsync()` |
| **Express Checkout** | `GetExpressCheckoutClientConfigAsync()`, `ProcessExpressCheckoutAsync()` |
| **Refunds** | `RefundPaymentAsync()` |
| **Webhooks** | `ValidateWebhookAsync()`, `ProcessWebhookAsync()`, `GetWebhookEventTemplatesAsync()`, `GenerateTestWebhookPayloadAsync()` |
| **Payment Links** | `CreatePaymentLinkAsync()`, `DeactivatePaymentLinkAsync()` |

**Integration Types:**
| Type | Description | Examples |
|------|-------------|----------|
| `Redirect` | User redirected to external page | Stripe Checkout |
| `HostedFields` | Inline card fields via SDK | Braintree Cards, Stripe Elements |
| `Widget` | Provider's embedded widget | Apple Pay, Google Pay, PayPal |
| `DirectForm` | Simple form fields (backoffice) | Manual payments |

**Built-in:** `ManualPaymentProvider`

### 4.4 Tax Providers

**ITaxProvider Interface:**

| Category | Methods |
|----------|---------|
| **Configuration** | `Metadata`, `GetConfigurationFieldsAsync()`, `ConfigureAsync()`, `ValidateConfigurationAsync()` |
| **Calculation** | `CalculateOrderTaxAsync()` |
| **Shipping Tax** | `GetShippingTaxRateForLocationAsync()` |

Single active provider at a time. **Built-in:** `ManualTaxProvider` (uses TaxGroup/TaxGroupRate)

### 4.5 Order Grouping Strategies

**IOrderGroupingStrategy Interface:**
- `Metadata` - Strategy metadata (alias, name, description)
- `GroupItemsAsync(OrderGroupingContext, CancellationToken)` - Group basket items

**OrderGroupingContext Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `Basket` | `Basket` | Current basket |
| `BillingAddress` | `Address` | Billing address |
| `ShippingAddress` | `Address` | Shipping address |
| `CustomerId` | `Guid?` | Customer ID |
| `CustomerEmail` | `string?` | Customer email |
| `Products` | `Dictionary<Guid, Product>` | Product lookup |
| `Warehouses` | `Dictionary<Guid, Warehouse>` | Warehouse lookup |
| `SelectedShippingOptions` | `Dictionary<Guid, Guid>` | Group → Option selections |
| `ExtendedData` | `Dictionary<string, object>` | Custom strategy data |

**Output:** `OrderGroupingResult` with `GroupId` (deterministic GUID), `GroupName`, `WarehouseId?`, `LineItems`, `AvailableShippingOptions`, `Metadata`

**Config:** `"Merchello:OrderGroupingStrategy": "vendor-grouping"` (empty = warehouse default)

**Default Strategy:** Groups by warehouse (stock → priority → region)

### Configuration Field Types

All providers use configuration fields: `Text`, `Password`, `Number`, `Checkbox`, `Select`, `Textarea`

---

## 5. Multi-Currency & Tax-Inclusive Display

This section documents the complete currency selection, conversion, and tax-inclusive display system. Understanding this flow is critical for maintaining checkout accuracy and payment consistency.

### 5.1 Currency Selection & Storage

**Storage Mechanism:**
- Customer currency preference stored in cookie (`Constants.Cookies.Currency`, 30-day expiry)
- `StorefrontContextService` manages all currency operations
- Default fallback: `MerchelloSettings.StoreCurrencyCode` (typically "USD")

**Automatic Country-Currency Mapping:**
- `CountryCurrencyMappingService` maps country codes to default currencies (80+ mappings)
- When shipping country changes, currency automatically updates
- Examples: "GB" → "GBP", "US" → "USD", "DE" → "EUR", "JP" → "JPY"

**API Endpoints:**
- `GET /api/merchello/storefront/currency` - Get current display currency
- `POST /api/merchello/storefront/currency` - Set display currency (sets cookie, triggers `BasketCurrencyChangedNotification`)

### 5.2 Exchange Rate Provider Architecture

**IExchangeRateProvider Interface:**
```csharp
public interface IExchangeRateProvider
{
    ExchangeRateProviderMetadata Metadata { get; }
    Task<ExchangeRateResult> GetRatesAsync(string baseCurrency, CancellationToken ct);
    Task<decimal?> GetRateAsync(string fromCurrency, string toCurrency, CancellationToken ct);
}
```

**Built-in Provider:** `FrankfurterExchangeRateProvider`
- Free API via European Central Bank (`https://api.frankfurter.dev/v1`)
- Returns rates as `Dictionary<string, decimal>` (currency → rate)

**Exchange Rate Cache (`IExchangeRateCache`):**
- Caches rates with configurable TTL
- Falls back to database on cache miss
- Calculates cross-rates when needed
- Returns `ExchangeRateQuote` with rate, timestamp, and source alias for audit

**Currency Service (`ICurrencyService`):**
- `Round(amount, currencyCode)` - Proper rounding per currency (JPY=0, BHD=3, default=2 decimals)
- `ToMinorUnits()` / `FromMinorUnits()` - Convert to/from cents for payment APIs

### 5.3 Basket Storage (Critical Architecture Decision)

**THE KEY RULE: Basket amounts NEVER change when currency changes.**

This is the Shopify approach - basket stores in base currency, display is calculated on-the-fly.

| Operation | What Changes | What Stays Same |
|-----------|--------------|-----------------|
| User selects "GBP" | `basket.Currency`, `basket.CurrencySymbol` | `basket.Total`, `basket.SubTotal`, `basket.Tax`, `basket.Shipping` |
| Add item to cart | All amount fields | Currency preference |
| Change quantity | Amounts recalculated in store currency | Currency preference |

**Example:**
```
Store currency: USD
User selects: GBP (exchange rate: 1.25 USD/GBP)

Basket stored:  {SubTotal: $100, Tax: $20, Total: $120, Currency: "GBP"}
                 ↑ These amounts are USD, not GBP!

Display shown:  GetDisplayAmounts() → {DisplayTotal: £96, ...}
                 ↑ Calculated: $120 ÷ 1.25 = £96
```

**Why This Matters:**
1. Exchange rates fluctuate - storing in base currency prevents cart total changes during browsing
2. Checkout conversion happens once at invoice creation with locked rate
3. Reporting always aggregates in store currency for consistency

### 5.4 Display Calculation Flow

**CRITICAL: Display uses MULTIPLY, Checkout uses DIVIDE**

| Context | Method | Formula | Use For |
|---------|--------|---------|---------|
| **UI Display** | `GetDisplayAmounts()` | `amount × rate` | Product pages, cart UI |
| **Checkout/Payment** | `ConvertToPresentmentCurrency()` | `amount ÷ rate` | Invoice creation |

**Why different directions?** The exchange rate is stored as "presentment to store" (e.g., 1.25 means £1 = $1.25). Display multiplies to show equivalent, checkout divides to convert store amounts to presentment.

**Product Display Calculation:**
```
DB Price (NET, Store Currency)
    → Apply Tax: price × (1 + taxRate/100)           [if DisplayPricesIncTax]
    → Convert: result × exchangeRate
    → Round: per currency decimal places
    → Display to Customer
```

**Example (USD store, UK customer, 20% VAT, rate 0.80):**
```
Stored:   $100.00 USD (NET)
Calc:     $100 × 1.20 (tax) × 0.80 (currency) = £96.00
Display:  "£96.00 inc VAT"
```

**Extension Methods (Display Only):**
- `product.GetDisplayPriceAsync(displayContext, taxService, currencyService)`
- `lineItem.GetDisplayLineItemTotal(displayContext, currencyService)`
- `basket.GetDisplayAmounts(displayContext, currencyService)`

**Tax Message Generation:**
When `DisplayPricesIncTax = true`, generates message like "Including £2.41 in taxes"

### 5.5 Checkout/Invoice Conversion

**Rate Locking at Invoice Creation:**
```csharp
// In CreateOrderFromBasketAsync():
var pricingQuote = await exchangeRateCache.GetRateQuoteAsync(presentmentCurrency, storeCurrency, ct);

invoice.PricingExchangeRate = pricingQuote.Rate;           // e.g., 1.25
invoice.PricingExchangeRateSource = pricingQuote.Source;   // e.g., "frankfurter"
invoice.PricingExchangeRateTimestampUtc = pricingQuote.Timestamp;
```

**Conversion Formula:**
```csharp
// Converting store amount to presentment (customer) currency
var presentmentAmount = currencyService.Round(storeAmount / rate, presentmentCurrency);
// Example: $120 ÷ 1.25 = £96
```

**Store Currency Calculation (for reporting):**
```csharp
// After invoice is in presentment currency, calculate store equivalents
invoice.TotalInStoreCurrency = currencyService.Round(invoice.Total * rate, storeCurrency);
// Example: £96 × 1.25 = $120
```

**Code Pattern - WRONG vs CORRECT:**
```csharp
// WRONG - Using display amounts for payment
var displayAmounts = basket.GetDisplayAmounts(context, currencyService);
config.Amount = displayAmounts.Total;  // PayPal sees display-converted amount

// CORRECT - Using invoice calculation path
var quote = await exchangeRateCache.GetRateQuoteAsync(presentmentCurrency, storeCurrency, ct);
var total = currencyService.Round(basket.Total / quote.Rate, presentmentCurrency);
config.Amount = total;  // PayPal sees same amount as invoice will have
```

### 5.6 Multi-Currency Fields (All Entities)

**Invoice:**
| Field | Description |
|-------|-------------|
| `CurrencyCode` | Presentment (customer) currency, e.g., "GBP" |
| `CurrencySymbol` | Snapshot symbol for display, e.g., "£" |
| `StoreCurrencyCode` | Store's base currency, e.g., "USD" |
| `PricingExchangeRate` | Locked rate at invoice creation |
| `PricingExchangeRateSource` | Provider alias for audit trail |
| `PricingExchangeRateTimestampUtc` | When rate was captured |
| `Total`, `SubTotal`, `Tax`, `Discount` | In presentment currency |
| `TotalInStoreCurrency`, `SubTotalInStoreCurrency`, `TaxInStoreCurrency`, `DiscountInStoreCurrency` | For reporting aggregation |

**Order:**
| Field | Description |
|-------|-------------|
| `ShippingCost` | In presentment currency |
| `ShippingCostInStoreCurrency` | For reporting |
| `DeliveryDateSurcharge` | In presentment currency |
| `DeliveryDateSurchargeInStoreCurrency` | For reporting |

**LineItem:**
| Field | Description |
|-------|-------------|
| `Amount` | Unit price in presentment currency |
| `AmountInStoreCurrency` | Unit price for reporting |
| `Cost` | COGS unit cost |
| `CostInStoreCurrency` | COGS for profit reporting |

### 5.7 Tax-Inclusive Display: Products vs Shipping

**Product Tax (Simple):**
- Rate from `TaxGroup` → `TaxGroupRate` (by customer location)
- Priority: State-specific → Country-level → TaxGroup default
- Calculation: `NET × (1 + taxRate/100)`

**Shipping Tax (4-Tier Priority):**

| Priority | Check | Result |
|----------|-------|--------|
| 1 | Regional `ShippingTaxOverride` with `ShippingTaxGroupId = null` | NOT taxed (0%) |
| 2 | Regional `ShippingTaxOverride` with `ShippingTaxGroupId` set | Use that group's rate |
| 3 | Global `isShippingTaxable` = false | NOT taxed (0%) |
| 4 | Configured `shippingTaxGroupId` | Use that group's rate |
| 5 | No specific rate | **Proportional calculation** |

**Proportional Calculation (EU/UK VAT Compliant):**
```
shippingTax = shippingAmount × (sum of line item taxes / sum of line item totals)
```
This ensures mixed-rate orders (e.g., food at 0% + electronics at 20%) distribute shipping tax fairly.

**What `DisplayPricesIncTax` Affects:**
- Product listings and detail pages
- Cart line items (tax-inclusive for UX consistency)
- Shipping display (when taxable)

**What It Does NOT Affect:**
- Basket storage (stays NET in store currency)
- `LineItemService.CalculateFromLineItems()` (handles tax separately)
- Invoice creation (uses calculated values)

### 5.8 StorefrontDisplayContext (Complete Structure)

```csharp
public record StorefrontDisplayContext(
    // Currency
    string CurrencyCode,              // Customer's display currency ("GBP")
    string CurrencySymbol,            // Symbol for display ("£")
    int DecimalPlaces,                // Rounding precision (2 for most, 0 for JPY)
    decimal ExchangeRate,             // Presentment → Store rate (1.25)
    string StoreCurrencyCode,         // Base store currency ("USD")

    // Tax Display
    bool DisplayPricesIncTax,         // Global setting from MerchelloSettings
    string TaxCountryCode,            // Customer's country for rate lookup
    string? TaxRegionCode,            // Region for state-specific rates
    decimal DefaultTaxRate = 0,       // Fallback rate

    // Shipping Tax
    bool IsShippingTaxable = true,    // From tax provider
    decimal? ShippingTaxRate = null); // Specific rate or null for proportional
```

**Built by `StorefrontContextService.GetDisplayContextAsync()`:**
1. Gets currency from cookie or defaults to store currency
2. Fetches exchange rate from cache
3. Gets tax settings from `MerchelloSettings`
4. Queries tax provider for shipping tax configuration

### 5.9 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ BROWSING (Display Only)                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ User selects "GBP" → Cookie set → StorefrontContextService returns context  │
│                                                                              │
│ Product Display:                                                             │
│   DB: $100 NET → Tax(20%): $120 → Convert(×0.80): £96 → Display: "£96 inc"  │
│                                                                              │
│ Basket Display:                                                              │
│   Basket stores: {SubTotal: $100, Tax: $20, Total: $120, Currency: "USD"}   │
│   GetDisplayAmounts() → {DisplayTotal: £96, ...}                            │
│   Basket amounts UNCHANGED                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ CHECKOUT (Rate Locking)                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ CreateOrderFromBasketAsync():                                                │
│   1. Fetch rate quote: GetRateQuoteAsync("GBP", "USD") → {Rate: 1.25, ...}  │
│   2. Lock on invoice: PricingExchangeRate=1.25, Source="frankfurter"        │
│   3. Convert: $120 ÷ 1.25 = £96 (stored in Invoice.Total)                   │
│   4. Calculate: TotalInStoreCurrency = £96 × 1.25 = $120 (for reporting)    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ PAYMENT (Uses Invoice Values)                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Payment provider receives: £96 GBP                                           │
│ Customer charged: £96 GBP                                                    │
│ Invoice shows: Total=£96, TotalInStoreCurrency=$120                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ REPORTING (Store Currency Aggregation)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Dashboard: Uses TotalInStoreCurrency for consistent aggregation              │
│ Invoice View: Shows both £96 (paid) and $120 (store equivalent)             │
│ Export: All amounts available in both currencies                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.10 Key Services Summary

| Service | Responsibility |
|---------|----------------|
| `StorefrontContextService` | Currency cookie management, display context building |
| `CountryCurrencyMappingService` | Country → currency auto-mapping |
| `IExchangeRateCache` | Rate caching, quote generation for locking |
| `ICurrencyService` | Rounding, minor unit conversion |
| `DisplayCurrencyExtensions` | Basket/line item display calculations |
| `DisplayPriceExtensions` | Product display price calculations |
| `InvoiceService` | Rate locking, presentment conversion, store currency calculation |

---

## 6. Entity Relationships

```
Supplier → 1:N → Warehouse → 1:N → ServiceRegions, ShippingOptions → ShippingCosts
                          → M:N → ProductRoot (ProductRootWarehouse with PriorityOrder)
                          → M:N → Product (ProductWarehouse: Stock, ReservedStock, TrackStock, RowVersion)

ProductRoot → 1:N → Product (variant), DefaultPackageConfigurations
Product → 1:N → PackageConfigurations
Product → 1:1 → HsCode

Customer → 1:N → Invoice (required, auto-created)
Customer → M:N → CustomerSegment (via member/criteria)
CustomerSegment → 1:N → CustomerSegmentMember (manual only)

Discount → 1:N → TargetRule, EligibilityRule, Usage
Discount → 1:1 → BuyXGetYConfig?, FreeShippingConfig?

Invoice → 1:N → Order → Shipment (N:1 Warehouse)
Invoice → 1:N → Payment (IdempotencyKey, WebhookEventId for dedup)
Order → 1:N → LineItems

WebhookSubscription → 1:N → WebhookDelivery (cascade)
```

---

## 7. Checkout Flow

### Warehouse Selection

1. Get from `ProductRootWarehouse` (by priority order)
2. Check `CanServeRegion(country, state)`
3. Check stock (`Stock - ReservedStock >= qty`)
4. Select first passing warehouse

### Service Regions

| Config | Meaning |
|--------|---------|
| No regions | Serves everywhere |
| `US, null, false` | Serves all USA |
| `US, HI, true` | Excludes Hawaii |
| `CA, QC, false` | Only serves Quebec |

State-specific overrides country-level rules.

### Shipping Resolution

```
Base = Product.ShippingOptions ?? Warehouse.ShippingOptions
Restriction:
  - None → use base
  - AllowList → only allowed options
  - ExcludeList → base minus excluded
```

Different restrictions = separate groups (even from same warehouse)

### Package Configuration

`ProductRoot.DefaultPackageConfigurations` (inherited) → `Product.PackageConfigurations` (override if populated)

`Product.HsCode` for customs (varies by variant)

`ProductPackage`: Weight(kg), LengthCm?, WidthCm?, HeightCm?

### Flow

```
Basket → GroupItemsAsync() → Groups → Customer selects shipping → Invoice (1) → Orders (/group) → Shipments (1+/order)
```

---

## 8. Notification System

### 8.1 Pattern

Hook into CRUD for validation/modification/integration using `INotificationAsyncHandler<T>`.

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

### Handler Priority

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

### 8.2 Events by Domain

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

**Exchange Events** (ExchangeRateRefreshJob):
- Refreshed, FetchFailed

**Special Events:**
- `InvoiceAggregateChangedNotification` - Fires on any Invoice/child change
- `MerchelloCacheRefresherNotification` - Distributed cache invalidation

### Integration Points

**Email:** `IEmailTopicRegistry` maps notifications → topics (e.g., `order.created` → Order Confirmation)

**Webhooks:** `IWebhookTopicRegistry` maps notifications → webhook topics

Both use handlers at priority 2000 that queue to `OutboundDelivery`, processed by `OutboundDeliveryJob`.

---

## 9. Integration Systems

### 9.1 Webhooks

Outbound webhook system. Shares infrastructure with Email via `OutboundDelivery`.

**Flow:**
```
Notification → WebhookNotificationHandler (2000) → IWebhookService.QueueDeliveryAsync()
    → WebhookDispatcher → HTTP POST → OutboundDelivery → OutboundDeliveryJob (retry)
```

**Components:**
- `WebhookSubscription` - URL, topic, auth, stats
- `OutboundDelivery` - Unified delivery record (`DeliveryType`: Webhook=0, Email=1)
- `IWebhookService` - CRUD, queue
- `IWebhookDispatcher` - HTTP + HMAC
- `IWebhookTopicRegistry` - Topic registration
- `WebhookNotificationHandler` - Queues deliveries
- `OutboundDeliveryJob` - Retry processing

**Topics:**
- Orders: created, updated, status_changed, cancelled
- Invoices: created, paid, refunded
- Products: created, updated, deleted
- Customers: created, updated, deleted
- Shipments: created, updated
- Discounts: created, updated, deleted
- Inventory: adjusted, low_stock, reserved, allocated
- Checkout: abandoned, recovered, converted
- Baskets: created, updated

**Auth Types:** `HmacSha256` (default, `X-Merchello-Hmac-SHA256`), `HmacSha512`, `BearerToken`, `ApiKey`, `BasicAuth`, `None`

**Payload Format:**
```json
{
  "id": "...",
  "topic": "order.created",
  "timestamp": "...",
  "api_version": "2024-01",
  "data": {}
}
```

**Configuration:**
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

### 9.2 Email

Automated email via notifications, configured in backoffice Email Builder.

**Flow:**
```
Notification → EmailNotificationHandler (2000) → IEmailConfigurationService.GetEnabledByTopicAsync()
    → IEmailService.QueueDeliveryAsync() → OutboundDeliveryJob → Umbraco IEmailSender
```

**Components:**
- `EmailConfiguration` - Email template config
- `IEmailService` - Queue and send
- `IEmailConfigurationService` - CRUD for configs
- `IEmailTopicRegistry` - 13 topics / 7 categories
- `IEmailTokenResolver` - Token replacement
- `IEmailTemplateDiscoveryService` - Find templates
- `EmailNotificationHandler` - Queues emails

**Topics:**
- Orders: created, status_changed, cancelled
- Payments: created, refunded
- Shipping: shipment.created, shipment.updated
- Customers: created, updated, password_reset
- Checkout: abandoned, recovered, converted
- Inventory: low_stock

**Tokens:** `{{order.customerEmail}}`, `{{order.billingAddress.name}}`, `{{store.name}}`, `{{store.websiteUrl}}`

**Configuration:**
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

## 10. Factories

All domain objects are created via factories for consistency, thread safety, and proper initialization.

| Factory | Creates |
|---------|---------|
| `InvoiceFactory` | `FromBasket()`, `CreateDraft()` |
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

---

## 11. Background Jobs

| Job | Purpose |
|-----|---------|
| `DiscountStatusJob` | Transitions discounts: Scheduled → Active → Expired |
| `OutboundDeliveryJob` | Processes webhook and email retry queue |
| `AbandonedCheckoutDetectionJob` | Detects abandoned carts, sends email sequence, expires old checkouts |
| `InvoiceReminderJob` | Sends payment reminders and overdue notices |

---

## 12. Caching

**ICacheService** wraps Umbraco `AppCaches` (distributed):

```csharp
GetOrCreateAsync(key, factory, ttl, tags)
RemoveAsync(key)
RemoveByTagAsync(tag)
distributedCache.ClearMerchelloCache("prefix")
```

**Prefixes:**
- `merchello:exchange-rates:*`
- `merchello:locality:*`
- `merchello:shipping:*`

**Deduplication:**
- `Payment.IdempotencyKey` - Prevents duplicate payment processing
- `Payment.WebhookEventId` - Prevents duplicate webhook processing

---

## 13. API Reference

### 13.1 Storefront API (`/api/merchello/storefront`)

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

### 13.2 Checkout API (`/api/merchello/checkout`)

Checkout flow endpoints.

**Basket & Addresses:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/basket` | GET | Get checkout basket |
| `/addresses` | POST | Save addresses |
| `/initialize` | POST | Initialize checkout |
| `/shipping/countries` | GET | Get shipping countries |
| `/shipping/regions/{code}` | GET | Get shipping regions |
| `/billing/countries` | GET | Get billing countries |
| `/billing/regions/{code}` | GET | Get billing regions |

**Shipping:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/shipping-groups` | GET | Get shipping groups |
| `/shipping` | POST | Save shipping selections |

**Discounts:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/discount/apply` | POST | Apply discount code |
| `/discount/{id}` | DELETE | Remove discount |

**Payments:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/payment-methods` | GET | Get payment methods |
| `/pay` | POST | Create payment session |
| `/process-payment` | POST | Process payment result |
| `/return` | GET | Payment return callback |
| `/cancel` | GET | Payment cancel callback |

**Express Checkout:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/express-methods` | GET | Get express methods |
| `/express-config` | GET | Get express SDK config |
| `/express` | POST | Process express checkout |
| `/express-payment-intent` | POST | Create express payment intent |

**Authentication:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/check-email` | POST | Check if email exists |
| `/validate-password` | POST | Validate password |
| `/sign-in` | POST | Sign in customer |

**Recovery:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/capture-email` | POST | Capture email for recovery |
| `/capture-address` | POST | Capture address for recovery |
| `/recover/{token}` | GET | Restore from recovery link |
| `/recover/{token}/validate` | GET | Validate recovery token |

### 13.3 Webhook API

**Payment Webhooks (public):**
`POST /umbraco/merchello/webhooks/payments/{providerAlias}`

**Outbound Webhook Management (`/api/v1/webhooks`):**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET/POST | List/create subscriptions |
| `/{id}` | GET/PUT/DELETE | Get/update/delete subscription |
| `/{id}/test` | POST | Send test webhook |
| `/{id}/regenerate-secret` | POST | Regenerate signing secret |
| `/{id}/deliveries` | GET | Get delivery history |
| `/topics` | GET | Get available topics |
| `/topics/by-category` | GET | Get topics by category |
| `/deliveries/{id}` | GET | Get delivery details |
| `/deliveries/{id}/retry` | POST | Retry delivery |
| `/stats` | GET | Get delivery stats |
| `/ping` | POST | Ping endpoint |

---

## 14. DTOs

### Storefront DTOs
`AddToBasketDto`, `UpdateQuantityDto`, `StorefrontBasketDto`, `StorefrontLineItemDto`, `ShippingCountriesDto`, `StorefrontCountryDto`, `StorefrontRegionDto`, `ProductAvailabilityDto`, `BasketAvailabilityDto`, `EstimatedShippingDto`

### Checkout DTOs
`CheckoutBasketDto`, `CheckoutLineItemDto`, `SaveAddressesRequestDto`, `InitializeCheckoutRequestDto`, `ShippingGroupDto`, `ShippingOptionDto`, `PaymentMethodDto`, `PaymentSessionResultDto`

---

## 15. Planned Features

### Subscriptions (Not Yet Implemented)

**ISubscriptionService (Planned):**
- `CreateSubscriptionAsync()` - Create subscription
- `CancelSubscriptionAsync()` - Cancel subscription
- `PauseSubscriptionAsync()` - Pause subscription
- `ResumeSubscriptionAsync()` - Resume subscription
- `ProcessRenewalAsync()` - Process renewal
- `UpdateStatusFromProviderAsync()` - Sync status from provider
- `GetMetricsAsync()` - Get subscription metrics

**Entity Relationships (Planned):**
```
Subscription → 1:1 → Customer, ProductRoot (IsSubscriptionProduct only)
Subscription → 1:N → SubscriptionInvoice → Invoice
```

Products with `IsSubscriptionProduct = true` purchased alone (one per basket).

**SubscriptionFactory (Planned):** Will create subscription entities.

### Other Planned Features

- **Backorder** - Orders when stock unavailable
- **Partial Fulfillment** - Ship partial orders
- **Return/Restock** - Return goods and restock inventory
- **Basket Reservation Expiry** - Expire reserved stock after timeout
- **Checkout Group Consolidation** - Merge groups when possible
