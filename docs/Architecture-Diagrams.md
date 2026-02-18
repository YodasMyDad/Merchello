# Merchello Architecture

An Enterprise (Shopify equivalent) ecommerce plugin for Umbraco v17+ (NuGet), where the Merchello project is a NuGet package with admin and Shopify-style integrated checkout. The Merchello.Site is an example site showing users how to leverage the package to build an ecommerce store making using of our API's and controllers to go inline with our ethos.

Ethos: making enterprise ecommerce simple.

## 1. Overview & Principles

### Core Principles
- Modular - ExtensionManager for plugins (ShippingProviders, PaymentProviders, TaxProviders, OrderGroupingStrategies)
- Services - Feature-grouped, DI, parameter models (RORO pattern)
- Factories - All key domain objects created via factories for consistency and thread safety
- Multi-warehouse - Variant-level stock with priority-based warehouse selection
- Single Source of Truth - All business logic and calculations are centralized in services. Key calculations (tax, totals, discounts, payment status, stock) must never be duplicated—always call the designated service method or provider. This ensures consistency, auditability, and maintainability across the entire system.

### Architecture Layers

```
CONTROLLERS → Thin: HTTP only, no logic, no DbContext
     ↓
SERVICES    → All business logic, all DB access, CrudResult<T>, RORO params
     ↓
FACTORIES   → All object creation, stateless singletons
```

Rules:
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

Modules: Accounting, AddressLookup, Auditing, Caching, Checkout, Customers, Data, Developer, DigitalProducts, Discounts, Email, ExchangeRates, Fulfilment, GiftCards, Locality, Notifications, Payments, ProductFeeds, Products, Protocols, Reporting, Returns, Search, Settings, Shared, Shipping, Storefront, Stores, Subscriptions, Suppliers, Tax, Upsells, Warehouses, Webhooks

### Design Rules
- DbContext only in services, never in controllers
- All service methods use RORO (Request/Response as Objects) parameters
- Return CrudResult<T> for operations that can fail
- Always use async/await with CancellationToken
- Use factories for entity creation
- Only add DB tables when absolutely necessary

## 2. Core Services by Domain

### 2.1 Products

IProductService:
- SaveProductOptions() - Save options (auto-regenerates variants when options change)
- PreviewAddonPriceAsync() - Preview add-on pricing

IProductCollectionService:
- GetProductCollections() - Get all collections
- GetProductCollectionsWithCounts() - Get collections with product counts
- GetCollection() - Get single collection
- GetCollectionsByIds() - Get multiple collections by ID
- CreateProductCollection() - Create collection
- UpdateProductCollection() - Update collection
- DeleteProductCollection() - Delete collection

IProductTypeService:
- GetProductTypes() - Get all product types
- GetProductTypesByIds() - Get product types by IDs
- CreateProductType() - Create product type
- UpdateProductType() - Update product type
- DeleteProductType() - Delete product type

IProductFilterService:
- Filter group and filter value CRUD operations
- GetFilterGroups(), CreateFilterGroup(), UpdateFilterGroup(), DeleteFilterGroup()
- GetFilter(), CreateFilter(), UpdateFilter(), DeleteFilter()
- Product-filter association management

Stock Status Calculation:
Backend calculates StockStatus enum: InStock | LowStock | OutOfStock | Untracked

Model Hierarchy:
- ProductRoot - Parent with options, TaxGroupId, DefaultPackageConfigurations, AllowExternalCarrierShipping
- Product - Variant with specific SKU, price, stock per warehouse, PackageConfigurations, HsCode

Front-End Product Routing:

Products are rendered at root-level URLs without requiring Umbraco content nodes:
- /{root-url} → ProductRoot with default variant
- /{root-url}/{variant-url} → ProductRoot with specific variant

Request Flow:
```
1. ProductContentFinder.TryFindContent() matches RootUrl
2. Creates MerchelloPublishedProduct (ContentType.Alias = "MerchelloProduct")
3. Umbraco route hijacking routes to MerchelloProductController
4. Controller renders ~/Views/Products/{ViewAlias}.cshtml
5. View receives MerchelloProductViewModel
```

Key Components:

| Component | Purpose |
|-----------|---------|
| ProductContentFinder | Intercepts product URLs after Umbraco content finder |
| MerchelloPublishedProduct | Virtual IPublishedContent wrapper for routing |
| MerchelloProductController | Renders views by ProductRoot.ViewAlias |
| MerchelloProductViewModel | View model with ProductRoot, SelectedVariant, AllVariants, pricing, stock |

View Selection:
- ProductRoot.ViewAlias stores view name (e.g., "Gallery")
- Resolves to ~/Views/Products/{ViewAlias}.cshtml
- Views discovered via ApplicationPartManager (works with RCLs)
- Config: MerchelloSettings.ProductViewLocations (default: ["~/Views/Products/"])

Element Type Properties (Optional):
- Select an Element Type per product in the product editor (stored on ProductRoot.ElementTypeAlias)
- Element Type tabs/properties render in product workspace after Merchello tabs
- Properties stored as JSON in ProductRoot.ElementPropertyData
- Access in Razor via Model.Content.Value<T>("alias")

Rich Text Rendering (TipTap):
```csharp
@inject IRichTextRenderer RichTextRenderer
@Model.ProductRoot.Description.ToTipTapHtml(RichTextRenderer)
```
Handles link/media resolution, block rendering, and HTML cleanup.

### 2.2 Inventory & Warehouses

IInventoryService:
- ReserveStockAsync() - Reserve stock on order creation
- AllocateStockAsync() - Allocate stock on shipment (Stock -= qty, Reserved -= qty)
- ReleaseReservationAsync() - Release reserved stock on cancellation
- ReverseAllocationAsync() - Reverse a previous allocation
- GetAvailableStockAsync() - Get available stock for a product/warehouse
- ValidateStockAvailabilityAsync() - Validate stock is available for quantity
- IsStockTrackedAsync() - Check if stock tracking is enabled
- ValidateBasketStockAsync() - Validate all basket items have sufficient stock

IWarehouseService:
- AdjustStock() - Manual stock corrections
- TransferStock() - Transfer between warehouses

Stock Flow (TrackStock=true):
```
Create Order → Check (Stock - Reserved >= qty) → Reserve (Reserved += qty)
Ship         → Allocate (Stock -= qty, Reserved -= qty)
Cancel       → Release (Reserved -= qty)
```

TrackStock = false for digital products, services, or drop-ship items.

### 2.3 Checkout & Baskets

ICheckoutService:
- CalculateBasketAsync() - Recalculate totals with tax and shipping
- SaveAddressesAsync() - Save addresses (stores marketing opt-in in CheckoutSession.AcceptsMarketing)

ICheckoutDiscountService:
- ApplyDiscountCodeAsync() - Apply promotional discount codes
- RemovePromotionalDiscountAsync() - Remove applied promotional discount
- RefreshPromotionalDiscountsAsync() - Recompute code + automatic discounts after basket changes
- RefreshAutomaticDiscountsAsync() - Compatibility wrapper around promotional refresh
- GetApplicableAutomaticDiscountsAsync() - Get applicable automatic discounts for basket
- AddDiscountToBasketAsync() - Add a discount to the basket
- RemoveDiscountFromBasketAsync() - Remove a discount from the basket

IAbandonedCheckoutService:
- TrackCheckoutActivityAsync() - Track customer checkout progress (resets Recovered/Abandoned → Active for re-abandonment)
- DetectAbandonedCheckoutsAsync() - Find abandoned carts (only processes Active status)
- SendScheduledRecoveryEmailsAsync() - Send recovery email sequence
- RestoreBasketFromRecoveryAsync() - Restore basket from recovery link (validates item availability)
- MarkAsConvertedAsync() - Mark checkout as converted (called for Active, Abandoned, or Recovered)
- GetStatsAsync() - Get abandonment statistics

Abandoned Checkout Status Lifecycle:
```
Active → Abandoned → Recovered → Converted
   ↑         ↓           ↓
   └─────────┴───────────┘  (activity resets to Active, enables re-abandonment)
                         └→ Expired (recovery window closed)
```

### 2.4 Invoices & Orders

IInvoiceService:
- CreateOrderFromBasketAsync(basket, session, source?) - Create invoice and orders from basket with optional source tracking
- CreateDraftOrderAsync() - Create draft order for manual entry
- CancelInvoiceAsync() - Cancel invoice and release stock
- QueryInvoices(parameters) - Query with filtering including SourceType

IInvoiceEditService:
- GetInvoiceForEditAsync() - Get invoice data prepared for editing
- PreviewInvoiceEditAsync() - Preview edit without saving
- EditInvoiceAsync() - Apply edits to invoice

Invoice Source Tracking:

Invoice.Source tracks order origin for analytics and auditing:

| Source Type | Use Case |
|-------------|----------|
| web | Traditional web checkout (default) |
| ucp | UCP AI agents (Google Gemini, ChatGPT, etc.) |
| api | Direct API integration |
| pos | Point of sale |
| draft | Admin-created orders |

Use Constants.InvoiceSources for well-known values. Query by source:
```csharp
await invoiceService.QueryInvoices(new InvoiceQueryParameters { SourceType = "ucp" });
```

ILineItemService:
- CalculateFromLineItems() - Calculate totals from line items
- AddDiscountLineItem() - Add discount line item

Calculation Flow:
```
CheckoutService.CalculateBasketAsync()
    → ResolveLineItemTaxRatesAsync()              ← Resolves per-location rates via TaxService
        → TaxService.GetApplicableRateAsync()        (state → country → TaxGroup default)
    → LineItemService.CalculateFromLineItems()
        → TaxCalculationService.CalculateOrderTax()  ← Uses resolved li.TaxRate values
```

Shared Calculation Logic:
| Calculation | Method |
|-------------|--------|
| Subtotal | productItems.Sum(li => Amount * Quantity) |
| Discounts | Before-tax, after-tax, linked, unlinked |
| Tax pro-rating | ITaxCalculationService.CalculateOrderTax() |
| Rounding | ICurrencyService.Round() |

Difference: Basket resolves rates from TaxGroupRate by location (accurate for ManualTaxProvider); Invoice additionally supports external tax providers (Avalara, TaxJar) for street-level precision.

Order Lifecycle:
```
Pending → AwaitingStock → ReadyToFulfill → Processing → Shipped/PartiallyShipped → Completed
Any (except Shipped/Completed) → Cancelled | OnHold
```

### 2.5 Shipping & Fulfillment

IShippingService:
- GetShippingOptionsForBasket() - Get available options for basket (calls order grouping strategy internally)
- GetShippingSummaryForReview() - Get summary for order review page
- GetRequiredWarehouses() - Determine warehouses needed
- GetShippingOptionsForWarehouseAsync() - Options for specific warehouse
- GetFulfillmentOptionsForProductAsync() - Fulfillment options for product
- GetDefaultFulfillingWarehouseAsync() - Get default warehouse for product
- GetShippingOptionsForProductAsync() - Options available for product

IShippingQuoteService:
- GetQuotesAsync() - Get shipping rate quotes (basket-level, may involve multiple warehouses)
- GetQuotesForWarehouseAsync() - Get quotes for a specific warehouse origin (used by order grouping)

IWarehouseProviderConfigService:
- GetByWarehouseAndProviderAsync() - Get config for warehouse/provider pair
- GetByWarehouseAsync() - All configs for a warehouse
- GetAllEnabledAsync() - All enabled configs
- CreateAsync() / UpdateAsync() / DeleteAsync() - CRUD operations

IShipmentService:
- CreateShipmentAsync() - Create single shipment
- CreateShipmentsFromOrderAsync() - Create batch shipments
- UpdateShipmentAsync() - Update shipment details
- UpdateShipmentStatusAsync() - Update status
- DeleteShipmentAsync() - Delete and release inventory
- GetFulfillmentSummaryAsync() - Get fulfillment summary

IShippingCostResolver:
- ResolveBaseCost() - Resolve base shipping cost
- GetTotalShippingCost() - Get total cost

Resolution Priority: State > Country > Universal(*) > FixedCost

### 2.6 Payments

IPaymentService:
- CalculatePaymentStatus() - Calculate invoice payment status (single source of truth)
- CreatePaymentSessionAsync() - Create payment session with provider
- ProcessPaymentAsync() - Process payment callback
- RecordPaymentAsync() - Record payment result
- ProcessRefundAsync() - Process refund
- RecordManualPaymentAsync() - Record offline payment

Risk Level: Backend calculates RiskLevel enum: high | medium | low | minimal

### 2.7 Tax

ITaxService:
- GetTaxGroups() - Get all tax groups
- GetApplicableRateAsync() - Get applicable rate for location
- GetShippingTaxOverrideAsync() - Get shipping tax override for region
- CreateShippingTaxOverrideAsync() - Create regional override
- UpdateShippingTaxOverrideAsync() - Update override
- DeleteShippingTaxOverrideAsync() - Delete override

ITaxProviderManager:
- GetActiveProviderAsync() - Get active tax provider
- IsShippingTaxedForLocationAsync() - Check if shipping is taxable
- GetShippingTaxRateForLocationAsync() - Get shipping tax rate

See [Section 3: Tax System](#3-tax-system) for detailed shipping tax documentation.

### 2.8 Customers & Segments

ICustomerService:
- GetOrCreateByEmailAsync() - Get or create customer (with acceptsMarketing param, ratchet-up: only false→true)

ICustomerSegmentService:
- IsCustomerInSegmentAsync() - Check segment membership

Segment Types:
- Manual - Explicit membership via CustomerSegmentMember
- Automated - Criteria-based (total spend, order count, days since last order, country, tags, date registered)

### 2.9 Discounts

IDiscountService:
- TryRecordUsageAsync() - Record discount usage (returns false if limit exceeded)

IDiscountEngine:
- CalculateAsync() - Calculate discount amounts
- ValidateCodeAsync() - Validate discount code
- ApplyDiscountsAsync() - Apply discounts to basket

Discount calculation notes:
- `ApplyAfterTax` is operational for amount-off-product and amount-off-order calculations.
- Free-shipping allow-lists validate all selected shipping groups (`DiscountContext.SelectedShippingOptionIds`).
- Checkout context includes product targeting metadata (`ProductTypeId`, `CollectionIds`, `ProductFilterIds`, `SupplierId`, `WarehouseId`) and tax metadata (`IsTaxable`, `TaxRate`) for accurate rule matching and tax-aware discount math.
- `ShowInFeed`, `FeedPromotionName`, and `Timezone` are currently metadata/display-only; scheduling execution uses UTC start/end fields.

IBuyXGetYCalculator:
- Calculate() - Calculate BOGO discounts

IInvoiceService:
- ApplyPromotionalDiscountAsync() - Apply promotional discount to invoice

### 2.10 Reporting

IReportingService:
- GetSalesBreakdownAsync() - TotalCost, GrossProfit, GrossProfitMargin
- GetBestSellersAsync() - Best selling products
- GetOrderStatsAsync() - Order statistics
- GetDashboardStatsAsync() - Dashboard KPIs
- GetOrdersForExportAsync() - Export orders

Cost Tracking: LineItem.Cost captured at order creation; add-on costs from ExtendedData["CostAdjustment"]

### 2.11 Statements

IStatementService:
- GetOutstandingInvoicesForCustomerAsync() - Outstanding invoices
- GetOutstandingBalanceAsync() - Customer balance
- GetOutstandingInvoicesPagedAsync() - Paged outstanding invoices
- GenerateStatementPdfAsync() - Generate PDF statement

### 2.12 Digital Products

IDigitalProductService:
- CreateDownloadLinksAsync() - Create download links for invoice (idempotent)
- ValidateDownloadTokenAsync() - Validate HMAC-signed download token
- RecordDownloadAsync() - Record download and increment counter
- GetCustomerDownloadsAsync() - Get customer's download links
- GetInvoiceDownloadsAsync() - Get download links for invoice
- IsDigitalOnlyInvoiceAsync() - Check if invoice contains only digital products
- RegenerateDownloadLinksAsync() - Invalidate old links and create new ones

Digital Product Settings (via ExtendedData):
Digital products use ProductRoot.ExtendedData with constant keys (no new model properties):
- DigitalDeliveryMethod - "InstantDownload" or "EmailDelivered"
- DigitalFileIds - JSON array of Umbraco Media IDs
- DownloadLinkExpiryDays - Link expiry (0 = unlimited)
- MaxDownloadsPerLink - Download limit (0 = unlimited)

Delivery Methods:

| Method | Confirmation Page | Email | Use Case |
|--------|------------------|-------|----------|
| InstantDownload | ✅ Shows links | ✅ Sends email | Standard digital products |
| EmailDelivered | ❌ Hidden | ✅ Email only | License keys, time-sensitive content |

Constraints:
- Digital products require customer account (no guest checkout)
- Digital products cannot have variant options (add-ons only: IsVariant = false)
- Digital-only orders auto-complete on successful payment

Security:
- HMAC-SHA256 token signing with constant-time comparison
- Customer ownership verification
- Rate limiting on download endpoint (30 requests/minute)
- Token format: {linkId:N}-{hmacSignature}

### 2.13 Storefront Context

IStorefrontContextService:
- GetShippingLocationAsync() - Get customer's shipping location from cookie/settings
- SetShippingCountry() - Set customer's preferred shipping country (writes cookie, auto-updates currency)
- GetCurrencyAsync() - Get current currency from cookie, derived from country, or store default
- SetCurrency() - Set customer's preferred currency
- GetDisplayContextAsync() - Get complete display context (currency, tax, location) for product display
- GetAvailableStockAsync() - Get stock available to customer's location (location-aware)
- GetProductAvailabilityAsync() - Get full availability info for product at current location
- GetBasketAvailabilityAsync() - Get availability for all basket items at a specific location
- ConvertToCustomerCurrencyAsync() - Convert amount to customer's selected currency

ICountryCurrencyMappingService:
- GetCurrencyForCountry() - Auto-map country code to default currency (80+ mappings)

### 2.14 Fulfilment

IFulfilmentService:
- SubmitOrderAsync() - Submit order to configured 3PL provider
- RetrySubmissionAsync() - Retry failed order submission
- CancelOrderAsync() - Cancel order at fulfilment provider
- ProcessStatusUpdateAsync() - Process status update from provider webhook
- ProcessShipmentUpdateAsync() - Process shipment update from provider webhook
- GetOrdersForPollingAsync() - Get orders needing status polling
- ResolveProviderForWarehouseAsync() - Resolve fulfilment provider for warehouse
- IsDuplicateWebhookAsync() - Check webhook idempotency
- TryLogWebhookAsync() - Atomic webhook idempotency insert (returns false on duplicate)

IFulfilmentSubmissionService:
- SubmitOrderAsync(parameters) - Trigger-aware submission coordinator used by payment-created automation and explicit staff release workflows
- Enforces source policy per provider:
  - Supplier Direct `OnPaid` accepts `PaymentCreated`
  - Supplier Direct `ExplicitRelease` accepts `ExplicitRelease`
  - Non-Supplier Direct providers reject `ExplicitRelease`
- Supports paid-gating for explicit release (`RequirePaidInvoice = true`)

### 2.15 Upsells

IUpsellService:
- QueryAsync() - Query upsell rules with pagination
- GetByIdAsync() - Get upsell rule by ID
- CreateAsync() - Create upsell rule
- UpdateAsync() - Update upsell rule
- DeleteAsync() - Delete upsell rule
- ActivateAsync() / DeactivateAsync() - Manage rule status
- GetActiveUpsellRulesAsync() - Get all active rules
- GetActiveUpsellRulesForLocationAsync() - Get active rules for display location

IUpsellEngine:
- GetSuggestionsAsync() - Evaluate rules against basket context and return suggestions
- GetSuggestionsForLocationAsync() - Get suggestions filtered by display location
- GetSuggestionsForInvoiceAsync() - Get suggestions for email templates
- GetSuggestionsForProductAsync() - Get suggestions for product page

IPostPurchaseUpsellService:
- InitializePostPurchaseAsync() - Initialize post-purchase window after payment
- GetAvailableUpsellsAsync() - Get available post-purchase upsells for invoice
- PreviewAddToOrderAsync() - Preview adding item without committing
- AddToOrderAsync() - Add item, charge saved method, record payment, then apply invoice edit (fails closed if recording fails)
- SkipUpsellsAsync() - Skip upsells and release fulfillment hold
- IsPostPurchaseWindowValidAsync() - Check if post-purchase window is still valid

### 2.16 Product Feeds

IProductFeedService:
- GetFeedsAsync() - List product feeds
- GetFeedAsync() - Read feed detail
- CreateFeedAsync() / UpdateFeedAsync() / DeleteFeedAsync() - CRUD with validation
- PreviewFeedAsync() - Lightweight diagnostics and sample product IDs
- RebuildFeedAsync() - Regenerate products/promotions XML snapshots
- ValidateFeedAsync() - Deep validation with issue reporting
- GetProductsXmlAsync() / GetPromotionsXmlAsync() - Token-protected feed output
- GetResolversAsync() - Resolver descriptors for backoffice configuration UIs

Resolver contracts:
- `IProductFeedValueResolver` remains the runtime resolver contract (non-breaking).
- Optional `IProductFeedResolverMetadata` adds UI metadata: `DisplayName`, `HelpText`, `SupportsArgs`, `ArgsHelpText`, `ArgsExampleJson`.
- Resolvers without metadata remain valid and are surfaced with alias/description fallback.
- Resolver implementation and external assembly extension steps are documented in `Product-Feed-Resolvers.md`.

Language and targeting requirements:
- `LanguageCode` is required for Product Feed create/update (ISO 639-1, e.g. `en`).
- `CountryCode`, `CurrencyCode`, and `LanguageCode` are all required because Google product and promotions feeds are market-targeted.

## 3. Tax System

### 3.1 Product Tax

Tax is calculated using TaxGroup entities. Each ProductRoot has a TaxGroupId linking it to a tax group with TaxPercentage.

ITaxService.GetApplicableRateAsync() returns the rate for a specific location, considering country/state overrides in TaxGroupRate.

#### TaxGroupId Data Flow

LineItem.TaxGroupId preserves the tax category through checkout for API-based tax providers:

```
ProductRoot.TaxGroupId
        ↓
LineItemFactory.CreateFromProduct() captures TaxGroupId + TaxRate (TaxGroup default)
        ↓
Basket.LineItems (TaxGroupId preserved)
        ↓
CheckoutService.ResolveLineItemTaxRatesAsync() updates TaxRate per-location
        ↓
LineItemFactory.CreateForOrder() preserves TaxGroupId
        ↓
Order.LineItems (TaxGroupId preserved)
        ↓
InvoiceService creates TaxableLineItem with TaxGroupId
        ↓
Provider.CalculateOrderTaxAsync() uses GetTaxCodeForTaxGroup()
        ↓
Provider sends correct tax code to API (Avalara, TaxJar, etc.)
```

Fallback Chain: If TaxGroupId is null or no mapping configured, providers use their default tax code (e.g., Avalara uses P0000000).

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
| 0m | Shipping explicitly NOT taxable | No shipping tax |
| decimal > 0 | Specific rate from override or tax group | Apply this rate |
| null | No specific rate configured | Use proportional calculation |

#### Proportional Calculation (EU/UK VAT)

When rate is null, use ITaxCalculationService.CalculateProportionalShippingTax():

```
shippingTax = shippingAmount × (lineItemTax / taxableSubtotal)
```

This ensures VAT compliance for mixed-rate orders (e.g., food at 0% + electronics at 20%).

Single Implementation: Always use CalculateProportionalShippingTax() - never duplicate this logic.

#### Entry Points (Where These Methods MUST Be Called)

| Entry Point | Service | Purpose |
|-------------|---------|---------|
| CalculateBasketAsync() | CheckoutService | Basket calculations during checkout |
| GetDisplayContextAsync() | StorefrontContextService | Tax-inclusive price display |
| CalculateShippingTaxAsync() | InvoiceService (internal) | Invoice total recalculation |

#### ManualTaxProvider Priority

1. Regional override with ShippingTaxGroupId = null → NOT taxed (returns 0m)
2. Regional override with ShippingTaxGroupId → Use that group's rate
3. Global shipping tax group configured → Use that group's rate
4. No group configured → Proportional calculation (returns null)

#### Rules

- NEVER hardcode shipping tax rates
- NEVER calculate shipping tax without consulting the provider methods
- NEVER assume shipping is always taxable or always at a fixed rate
- ALWAYS use CalculateProportionalShippingTax() for proportional - don't duplicate logic

## 4. Provider Systems

### 4.1 Extension Manager

ExtensionManager scans assemblies to discover and instantiate provider implementations.

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

IShippingProvider Interface:

| Category | Methods |
|----------|---------|
| Configuration | Metadata, GetConfigurationFieldsAsync(), GetMethodConfigFieldsAsync(), ConfigureAsync() |
| Availability | IsAvailableFor() |
| Rates (Static) | GetRatesAsync(), GetRatesForServicesAsync(), GetSupportedServiceTypesAsync() |
| Rates (Dynamic) | GetAvailableServicesAsync(), GetRatesForAllServicesAsync() |
| Delivery Dates | GetAvailableDeliveryDatesAsync(), CalculateDeliveryDateSurchargeAsync(), ValidateDeliveryDateAsync() |

Provider Types:

| Type | UsesLiveRates | ShippingOptions | Rates Source |
|------|--------------------|-----------------|--------------|
| Flat Rate | false | Per-warehouse ShippingOption records with costs/weight tiers | ShippingCostResolver (DB lookup) |
| External Carriers | true | Not needed - uses WarehouseProviderConfig | Carrier API via GetRatesForAllServicesAsync() |

Dynamic Provider Flow:
1. WarehouseProviderConfig enables provider per-warehouse (markup, exclusions)
2. At checkout, ShippingQuoteService.GetQuotesForWarehouseAsync() calls provider
3. Provider fetches ALL available rates from carrier API
4. Excluded services filtered, markup applied from WarehouseProviderConfig
5. Rates returned in basket currency

Shipping Option Visibility Rules:

| ProviderKey | Provider Status | Visibility |
|-------------|-----------------|------------|
| flat-rate | N/A (always available) | Shown when ShippingCostResolver resolves a destination cost (destination rates first, fixed-cost fallback) |
| External (e.g., fedex) | Enabled & configured | Shown with live rates from carrier API |
| External (e.g., fedex) | Not enabled | Hidden - options filtered out |

Flat-rate cost resolution (single source of truth):
1. `ShippingCostResolver` resolves in priority order: State -> Country -> Universal `*` -> FixedCost fallback.
2. For flat-rate options, `FixedCost = null` is normalized to `0` (free fallback).
3. `FlatRateShippingProvider` consumes pre-resolved `DestinationCost`; it does not duplicate base-cost matching logic.

Important: External/dynamic providers (UsesLiveRates = true) cannot have fixed costs. They fetch rates from carrier APIs at runtime. If you need flat-rate options named after carriers (e.g., "FedEx Ground" with a fixed $8.99 cost), use ProviderKey = "flat-rate":

```csharp
// ✓ Correct: Flat-rate option named after carrier
new ShippingOptionConfig { Name = "FedEx Ground", Cost = 8.99m } // ProviderKey defaults to "flat-rate"

// ✗ Wrong: Dynamic provider with fixed cost (will show "Calculated at checkout" or be hidden)
new ShippingOptionConfig { Name = "FedEx Ground", Cost = 8.99m, ProviderKey = "fedex", ServiceType = "FEDEX_GROUND" }
```

Built-in: FlatRateShippingProvider, FedExShippingProvider, UpsShippingProvider

Currency Conversion: External providers use IExchangeRateCache for currency conversion.

### 4.3 Payment Providers

IPaymentProvider Interface:

| Category | Methods |
|----------|---------|
| Configuration | Metadata, GetConfigurationFieldsAsync(), ConfigureAsync() |
| Payment Methods | GetAvailablePaymentMethods() - Returns all methods (Cards, Apple Pay, etc.) |
| Sessions | CreatePaymentSessionAsync(), ProcessPaymentAsync(), CapturePaymentAsync() |
| Express Checkout | GetExpressCheckoutClientConfigAsync(), ProcessExpressCheckoutAsync() |
| Refunds | RefundPaymentAsync() |
| Webhooks | ValidateWebhookAsync(), ProcessWebhookAsync(), GetWebhookEventTemplatesAsync(), GenerateTestWebhookPayloadAsync() |
| Payment Links | CreatePaymentLinkAsync(), DeactivatePaymentLinkAsync() |

Integration Types:
| Type | Description | Examples |
|------|-------------|----------|
| Redirect | User redirected to external page | Stripe Checkout |
| HostedFields | Inline card fields via SDK | Braintree Cards, Stripe Elements |
| Widget | Provider's embedded widget | Apple Pay, Google Pay, PayPal |
| DirectForm | Simple form fields (backoffice) | Manual payments |

Built-in: ManualPaymentProvider, AmazonPayPaymentProvider, BraintreePaymentProvider, PayPalPaymentProvider, StripePaymentProvider, WorldPayPaymentProvider

### 4.4 Tax Providers

ITaxProvider Interface:

| Category | Methods |
|----------|---------|
| Configuration | Metadata, GetConfigurationFieldsAsync(), ConfigureAsync(), ValidateConfigurationAsync() |
| Calculation | CalculateOrderTaxAsync() |
| Shipping Tax | GetShippingTaxRateForLocationAsync() |

Single active provider at a time. Built-in: ManualTaxProvider (uses TaxGroup/TaxGroupRate), AvalaraTaxProvider (external API integration)

### 4.5 Order Grouping Strategies

IOrderGroupingStrategy Interface:
- Metadata - Strategy metadata (alias, name, description)
- GroupItemsAsync(OrderGroupingContext, CancellationToken) - Group basket items

OrderGroupingContext Properties:

| Property | Type | Description |
|----------|------|-------------|
| Basket | Created, Clearing?/Cleared, ItemAdding?/Added, ItemRemoving?/Removed, QuantityChanging?/Changed | CheckoutService |
| BillingAddress | Address | Billing address |
| ShippingAddress | Address | Shipping address |
| CustomerId | Guid? | Customer ID |
| CustomerEmail | string? | Customer email |
| Products | Dictionary<Guid, Product> | Product lookup |
| Warehouses | Dictionary<Guid, Warehouse> | Warehouse lookup |
| SelectedShippingOptions | Dictionary<Guid, string> | Group → SelectionKey (e.g., "so:{id}" or "dyn:fedex:FEDEX_GROUND") |
| ExtendedData | Dictionary<string, object> | Custom strategy data |

Output: OrderGroupingResult with GroupId (deterministic GUID), GroupName, WarehouseId?, LineItems, AvailableShippingOptions, Metadata

Config: "Merchello:OrderGroupingStrategy": "vendor-grouping" (empty = warehouse default)

Default Strategy: Groups by warehouse (stock → priority → region). For each group:
- Flat-rate options resolved via ShippingCostResolver (DB lookup)
- Dynamic provider options resolved via ShippingQuoteService.GetQuotesForWarehouseAsync() (carrier API calls)
- Products with ProductRoot.AllowExternalCarrierShipping = false only show flat-rate options

### 4.6 Commerce Protocol Adapters

Protocol adapters enable Merchello to expose checkout and order capabilities to external AI agents and platforms using standardized protocols like UCP (Universal Commerce Protocol).

ICommerceProtocolAdapter Interface:

| Category | Methods |
|----------|---------|
| Identity | Metadata, IsEnabled |
| Discovery | GenerateManifestAsync(), NegotiateCapabilitiesAsync() |
| Sessions | CreateSessionAsync(), GetSessionAsync(), UpdateSessionAsync(), CompleteSessionAsync(), CancelSessionAsync() |
| Orders | GetOrderAsync() |
| Payments | GetPaymentHandlersAsync() |

CommerceProtocolManager:
- Discovers adapters via ExtensionManager
- Caches adapter instances
- Routes protocol requests to appropriate adapter
- Supports capability negotiation with agents
- Startup provider discovery explicitly scans assemblies for `ICommerceProtocolAdapter` implementations

Agent Authentication (AgentAuthenticationMiddleware):
- Treats `/.well-known/ucp`, `/api/v1/checkout-sessions*`, and `/api/v1/orders*` as UCP routes (header-independent path detection)
- Validates UCP-Agent header (RFC 8941 Dictionary Structured Field) when required by route
- Enforces strict transactional headers on UCP API routes: `UCP-Agent`, `Request-Signature`, `Request-Id`
- Enforces `Idempotency-Key` on create/update/complete write operations
- Delegates signature verification to `IAgentAuthenticator` (`UcpAgentAuthenticator`) using raw request body bytes + agent profile signing keys
- Checks agent against allowed list (Merchello:Protocols:Ucp:AllowedAgents)
- Publishes AgentAuthenticatingNotification (cancelable) and AgentAuthenticatedNotification
- Stores AgentIdentity in HttpContext.Items for controllers
- Keeps `/.well-known/ucp` negotiable (auth failures there are non-fatal)

Order Source Tracking:
- UCP orders tracked via Invoice.Source with Type = "ucp"
- Captures agent ID, profile URI, and protocol version
- Enables filtering/reporting by source (see Section 2.4)

Webhook Signing (IWebhookSigner, ISigningKeyStore):
- ES256 (ECDSA P-256) signatures for webhook payloads
- RFC 7797 detached JWT format
- Automatic key rotation support
- Signing keys persisted in merchelloSigningKeys table with in-memory caching
- Supports multi-instance deployments (keys survive restarts)

Configuration:
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

### 4.7 Fulfilment Providers

Pluggable system for 3PL (third-party logistics) integration. Separate from Shipping Providers - shipping calculates rates, fulfilment handles physical work.

IFulfilmentProvider Interface:

| Category | Methods |
|----------|---------|
| Configuration | Metadata, GetConfigurationFieldsAsync(), ConfigureAsync(), TestConnectionAsync() |
| Orders | SubmitOrderAsync(), CancelOrderAsync() |
| Webhooks | ValidateWebhookAsync(), ProcessWebhookAsync() |
| Polling | PollOrderStatusAsync() |
| Sync | SyncProductsAsync(), GetInventoryLevelsAsync() |

Built-in: ShipBobFulfilmentProvider

Supplier Direct trigger modes (per supplier profile):
- `OnPaid` - automatic submission from payment-created flow (current default)
- `ExplicitRelease` - staff-triggered submission per order via `POST /orders/{orderId}/fulfillment/release`

Trigger routing:
- Payment-created path (`FulfilmentOrderSubmissionHandler`) calls `IFulfilmentSubmissionService` with source `PaymentCreated`
- Explicit release API path calls `IFulfilmentSubmissionService` with source `ExplicitRelease` and paid-gating enabled
- Dynamic/non-Supplier Direct providers are unaffected and continue their current payment-created behavior

Shipping → Fulfilment Bridge (Service Category Inference):

3PLs don't use carrier-specific codes (e.g., FEDEX_GROUND). They need speed tiers (Standard, Express, Overnight). The system infers the speed tier from carrier transit time data:

```
Carrier API → TransitTime → DaysFrom/DaysTo on ShippingOptionInfo
  → InferServiceCategory() at order creation → Order.ShippingServiceCategory
  → ResolveShippingServiceCode() at fulfilment submission → 3PL-specific method code
```

ShippingServiceCategory enum: Standard (4-7 days), Economy (8+), Express (2-3), Overnight (≤1)

Resolution Priority (ResolveShippingServiceCode):
1. ServiceCategoryMapping_{Category} from provider settings (category-based)
2. DefaultShippingMethod from provider settings (catch-all)
3. Raw carrier code from Order.ShippingServiceCode (last resort)

Each fulfilment provider defines category mappings via GetConfigurationFieldsAsync() (auto-rendered in config UI):
```
ShipBob: { Standard → "Ground", Express → "2-Day", Overnight → "Overnight", Economy → "Standard" }
```

### Configuration Field Types

All providers use configuration fields: Text, Password, Number, Checkbox, Select, Textarea

## 5. Multi-Currency & Tax-Inclusive Display

This section documents the complete currency selection, conversion, and tax-inclusive display system. Understanding this flow is critical for maintaining checkout accuracy and payment consistency.

### 5.1 Currency Selection & Storage

Storage Mechanism:
- Customer currency preference stored in cookie (Constants.Cookies.Currency, 30-day expiry)
- StorefrontContextService manages all currency operations
- Default fallback: MerchelloSettings.StoreCurrencyCode (typically "USD")

Automatic Country-Currency Mapping:
- CountryCurrencyMappingService maps country codes to default currencies (80+ mappings)
- When shipping country changes, currency automatically updates
- Examples: "GB" → "GBP", "US" → "USD", "DE" → "EUR", "JP" → "JPY"

API Endpoints:
- GET /api/merchello/storefront/currency - Get current display currency
- POST /api/merchello/storefront/currency - Set display currency (sets cookie, triggers BasketCurrencyChangedNotification)

### 5.2 Exchange Rate Provider Architecture

IExchangeRateProvider Interface:
```csharp
public interface IExchangeRateProvider
{
    ExchangeRateProviderMetadata Metadata { get; }
    Task<ExchangeRateResult> GetRatesAsync(string baseCurrency, CancellationToken ct);
    Task<decimal?> GetRateAsync(string fromCurrency, string toCurrency, CancellationToken ct);
}
```

Built-in Provider: FrankfurterExchangeRateProvider
- Free API via European Central Bank (https://api.frankfurter.dev/v1)
- Returns rates as Dictionary<string, decimal> (currency → rate)

Exchange Rate Cache (IExchangeRateCache):
- Caches rates with configurable TTL
- Falls back to database on cache miss
- Calculates cross-rates when needed
- Returns ExchangeRateQuote with rate, timestamp, and source alias for audit

Currency Service (ICurrencyService):
- Round(amount, currencyCode) - Proper rounding per currency (JPY=0, BHD=3, default=2 decimals)
- ToMinorUnits() / FromMinorUnits() - Convert to/from cents for payment APIs

### 5.3 Basket Storage (Critical Architecture Decision)

THE KEY RULE: Basket amounts NEVER change when currency changes.

This is the Shopify approach - basket stores in base currency, display is calculated on-the-fly.

| Operation | What Changes | What Stays Same |
|-----------|--------------|-----------------|
| User selects "GBP" | basket.Currency, basket.CurrencySymbol | basket.Total, basket.SubTotal, basket.Tax, basket.Shipping |
| Add item to cart | All amount fields | Currency preference |
| Change quantity | Amounts recalculated in store currency | Currency preference |

Example:
```
Store currency: USD
User selects: GBP (exchange rate: 1.25 USD/GBP)

Basket stored:  {SubTotal: $100, Tax: $20, Total: $120, Currency: "GBP"}
                 ↑ These amounts are USD, not GBP!

Display shown:  GetDisplayAmounts() → {DisplayTotal: £96, ...}
                 ↑ Calculated: $120 ÷ 1.25 = £96
```

Why This Matters:
1. Exchange rates fluctuate - storing in base currency prevents cart total changes during browsing
2. Checkout conversion happens once at invoice creation with locked rate
3. Reporting always aggregates in store currency for consistency

### 5.4 Display Calculation Flow

CRITICAL: Display uses MULTIPLY, Checkout uses DIVIDE

| Context | Method | Formula | Use For |
|---------|--------|---------|---------|
| UI Display | GetDisplayAmounts() | amount × rate | Product pages, cart UI |
| Checkout/Payment | ConvertToPresentmentCurrency() | amount ÷ rate | Invoice creation |

Why different directions? The exchange rate is stored as "presentment to store" (e.g., 1.25 means £1 = $1.25). Display multiplies to show equivalent, checkout divides to convert store amounts to presentment.

Product Display Calculation:
```
DB Price (NET, Store Currency)
    → Apply Tax: price × (1 + taxRate/100)           [if DisplayPricesIncTax]
    → Convert: result × exchangeRate
    → Round: per currency decimal places
    → Display to Customer
```

Example (USD store, UK customer, 20% VAT, rate 0.80):
```
Stored:   $100.00 USD (NET)
Calc:     $100 × 1.20 (tax) × 0.80 (currency) = £96.00
Display:  "£96.00 inc VAT"
```

Extension Methods (Display Only):
- product.GetDisplayPriceAsync(displayContext, taxService, currencyService)
- lineItem.GetDisplayLineItemTotal(displayContext, currencyService)
- basket.GetDisplayAmounts(displayContext, currencyService)

Tax Message Generation:
When DisplayPricesIncTax = true, generates message like "Including £2.41 in taxes"

### 5.5 Checkout/Invoice Conversion

Rate Locking at Invoice Creation:
```csharp
// In CreateOrderFromBasketAsync():
var pricingQuote = await exchangeRateCache.GetRateQuoteAsync(presentmentCurrency, storeCurrency, ct);

invoice.PricingExchangeRate = pricingQuote.Rate;           // e.g., 1.25
invoice.PricingExchangeRateSource = pricingQuote.Source;   // e.g., "frankfurter"
invoice.PricingExchangeRateTimestampUtc = pricingQuote.Timestamp;
```

Conversion Formula:
```csharp
// Converting store amount to presentment (customer) currency
var presentmentAmount = currencyService.Round(storeAmount / rate, presentmentCurrency);
// Example: $120 ÷ 1.25 = £96
```

Store Currency Calculation (for reporting):
```csharp
// After invoice is in presentment currency, calculate store equivalents
invoice.TotalInStoreCurrency = currencyService.Round(invoice.Total * rate, storeCurrency);
// Example: £96 × 1.25 = $120
```

Code Pattern - WRONG vs CORRECT:
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

Invoice:
| Field | Description |
|-------|-------------|
| CurrencyCode | Presentment (customer) currency, e.g., "GBP" |
| CurrencySymbol | Snapshot symbol for display, e.g., "£" |
| StoreCurrencyCode | Store's base currency, e.g., "USD" |
| PricingExchangeRate | Locked rate at invoice creation |
| PricingExchangeRateSource | Provider alias for audit trail |
| PricingExchangeRateTimestampUtc | When rate was captured |
| Total, SubTotal, Tax, Discount | In presentment currency |
| TotalInStoreCurrency, SubTotalInStoreCurrency, TaxInStoreCurrency, DiscountInStoreCurrency | For reporting aggregation |

Order:
| Field | Description |
|-------|-------------|
| ShippingOptionId | Flat-rate ShippingOption reference (Guid.Empty for dynamic providers) |
| ShippingProviderKey | Provider key (e.g., "flat-rate", "fedex", "ups") |
| ShippingServiceCode | Carrier service code (e.g., "FEDEX_GROUND") - null for flat-rate |
| ShippingServiceName | Display name of carrier service |
| ShippingServiceCategory | Inferred speed tier (ShippingServiceCategory?) for 3PL routing |
| ShippingCost | In presentment currency |
| ShippingCostInStoreCurrency | For reporting |
| QuotedShippingCost | Rate shown to customer at selection time |
| QuotedAt | When the shipping quote was obtained |
| DeliveryDateSurcharge | In presentment currency |
| DeliveryDateSurchargeInStoreCurrency | For reporting |

LineItem:
| Field | Description |
|-------|-------------|
| Amount | Unit price in presentment currency |
| AmountInStoreCurrency | Unit price for reporting |
| Cost | COGS unit cost |
| CostInStoreCurrency | COGS for profit reporting |

### 5.7 Tax-Inclusive Display: Products vs Shipping

Product Tax:
- Product display: DisplayPriceExtensions.GetDisplayPriceAsync() calls TaxService.GetApplicableRateAsync() directly
- Basket line items: CheckoutService.ResolveLineItemTaxRatesAsync() updates each li.TaxRate before calculation
- Basket display: GetDisplayAmounts() / GetDisplayLineItemTotal() uses resolved li.TaxRate
- Priority: State-specific → Country-level → TaxGroup default
- Calculation: NET × (1 + taxRate/100)

Shipping Tax (4-Tier Priority):

| Priority | Check | Result |
|----------|-------|--------|
| 1 | Regional ShippingTaxOverride with ShippingTaxGroupId = null | NOT taxed (0%) |
| 2 | Regional ShippingTaxOverride with ShippingTaxGroupId set | Use that group's rate |
| 3 | Global isShippingTaxable = false | NOT taxed (0%) |
| 4 | Configured shippingTaxGroupId | Use that group's rate |
| 5 | No specific rate | Proportional calculation |

Proportional Calculation (EU/UK VAT Compliant):
```
shippingTax = shippingAmount × (sum of line item taxes / sum of line item totals)
```
This ensures mixed-rate orders (e.g., food at 0% + electronics at 20%) distribute shipping tax fairly.

What DisplayPricesIncTax Affects:
- Product listings and detail pages
- Cart line items (tax-inclusive for UX consistency)
- Shipping display (when taxable)

What It Does NOT Affect:
- Basket storage (stays NET in store currency)
- LineItemService.CalculateFromLineItems() (handles tax separately)
- Invoice creation (uses calculated values)

### 5.8 StorefrontDisplayContext (Complete Structure)

```csharp
public record StorefrontDisplayContext(
    // Currency
    string CurrencyCode,              // Customer's display currency ("GBP")
    string CurrencySymbol,            // Symbol for display ("£")
    int DecimalPlaces,                // Rounding precision (2 for most, 0 for JPY)
    decimal ExchangeRate,             // Store → Presentment rate (0.80 for USD→GBP)
    string StoreCurrencyCode,         // Base store currency ("USD")

    // Tax Display
    bool DisplayPricesIncTax,         // Global setting from MerchelloSettings
    string TaxCountryCode,            // Customer's country for rate lookup
    string? TaxRegionCode,            // Region for state-specific rates

    // Shipping Tax
    bool IsShippingTaxable = true,    // From tax provider
    decimal? ShippingTaxRate = null); // Specific rate or null for proportional
```

Built by StorefrontContextService.GetDisplayContextAsync():
1. Gets currency from cookie or defaults to store currency
2. Fetches exchange rate from cache
3. Gets tax settings from MerchelloSettings
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
| StorefrontContextService | Currency cookie management, display context building |
| CountryCurrencyMappingService | Country → currency auto-mapping |
| IExchangeRateCache | Rate caching, quote generation for locking |
| ICurrencyService | Rounding, minor unit conversion |
| DisplayCurrencyExtensions | Basket/line item display calculations |
| DisplayPriceExtensions | Product display price calculations |
| InvoiceService | Rate locking, presentment conversion, store currency calculation |

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

Discount → 1:N → Usage
Discount → JSON → TargetRules[], EligibilityRules[], BuyXGetYConfig?, FreeShippingConfig?

Invoice → 1:N → Order → Shipment (N:1 Warehouse)
Invoice → 1:N → Payment (IdempotencyKey, WebhookEventId for dedup)
Invoice → 1:N → DownloadLink (digital product downloads)
Order → 1:N → LineItems

DownloadLink → N:1 → Invoice, LineItem, Customer

Warehouse → 0:N → WarehouseProviderConfig (per-provider config: markup, exclusions)

Order → 0:1 → FulfilmentProviderConfiguration
Warehouse → 0:1 → FulfilmentProviderConfiguration
Supplier → 0:1 → FulfilmentProviderConfiguration (default)

WebhookSubscription → 1:N → WebhookDelivery (cascade)
```

## 7. Checkout Flow

### Warehouse Selection

1. Get from ProductRootWarehouse (by priority order)
2. Check CanServeRegion(country, state)
3. Check stock (Stock - ReservedStock >= qty)
4. Select first passing warehouse

### Service Regions

| Config | Meaning |
|--------|---------|
| No regions | Serves everywhere |
| US, null, false | Serves all USA |
| US, HI, true | Excludes Hawaii |
| CA, QC, false | Only serves Quebec |

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

ProductRoot.DefaultPackageConfigurations (inherited) → Product.PackageConfigurations (override if populated)

Product.HsCode for customs (varies by variant)

ProductPackage: Weight(kg), LengthCm?, WidthCm?, HeightCm?

### Shipping Selection Format

Shipping selections use the SelectionKey format (stored in CheckoutSession.SelectedShippingOptions as Dict<Guid, string>):

| Format | Example | Description |
|--------|---------|-------------|
| so:{guid} | so:a1b2c3d4-... | Flat-rate ShippingOption |
| dyn:{provider}:{serviceCode} | dyn:fedex:FEDEX_GROUND | Dynamic provider service |

At order creation, SelectionKey is parsed to populate Order.ShippingProviderKey, Order.ShippingServiceCode, and Order.ShippingServiceName. The quoted rate (from CheckoutSession.QuotedShippingCosts) is honored rather than re-fetching.

### Flow

```
Basket → GroupItemsAsync() → Groups (flat-rate + dynamic quotes) → Customer selects shipping (SelectionKey) → Invoice (1) → Orders (/group) → Shipments (1+/order)
```

### Checkout Frontend Asset Pipeline

Checkout page scripts are served as static plugin assets, not hashed bundle chunks.

| Concern | Source | Output (served path) |
|--------|--------|----------------------|
| Checkout runtime JS (`index.js`, `analytics.js`, adapters, components) | `src/Merchello/Client/public/js/checkout/*` | `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/*` |
| Checkout/storefront plugin images | `src/Merchello/Client/public/img/*` | `src/Merchello/wwwroot/App_Plugins/Merchello/img/*` |
| Backoffice extension code | `src/Merchello/Client/src/*` | `src/Merchello/wwwroot/App_Plugins/Merchello/*.js` (bundled/hashed) |

Build behavior:
- Vite writes to `src/Merchello/wwwroot/App_Plugins/Merchello` with `emptyOutDir: true`.
- Vite copies everything in `Client/public` into that output (`publicDir`), preserving the `js/checkout/*` path contract.
- Checkout views and provider adapter URLs must continue to target `/App_Plugins/Merchello/js/checkout/*`.

## 8. Notification System

### 8.1 Base Classes

All notifications inherit from one of three base classes depending on their purpose:

| Base Class | When to Use | Can Cancel? | Has Entity? |
|------------|-------------|-------------|-------------|
| MerchelloNotification | After events (read-only observation) | No | No |
| MerchelloCancelableNotification<T> | Before events with entity modification | Yes | Yes |
| MerchelloSimpleCancelableNotification | Before events without entity (e.g., stock operations) | Yes | No |

State Dictionary: All notifications include a State dictionary for sharing data between handlers:

```csharp
// In a "Before" handler (priority 1000):
notification.State["originalPrice"] = product.Price;

// In a later handler (priority 2000):
if (notification.State.TryGetValue("originalPrice", out var price))
    await auditService.LogPriceChange((decimal)price, product.Price);
```

### 8.2 Pattern

Hook into CRUD for validation/modification/integration using INotificationAsyncHandler<T>.

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

| Priority | Handler | Purpose |
|----------|---------|---------|
| 1000 | *(default)* | Default priority (NotificationHandlerPriorityAttribute.DefaultPriority) |
| 1500 | DigitalProductPaymentHandler | Digital product link creation after payment |
| 1800 | FulfilmentOrderSubmissionHandler | 3PL order submission from payment-created events (provider trigger-policy aware) |
| 1800 | FulfilmentCancellationHandler | 3PL cancellation after status change |
| 1900 | FulfilmentAutoShipmentHandler | Auto-shipment creation on order submission |
| 1900 | PaymentPostPurchaseHandler | Post-purchase upsell window initialization |
| 2000 | InvoiceTimelineHandler | Internal audit/timeline logging |
| 2050 | UpsellEmailEnrichmentHandler | Enriches emails with upsell data |
| 2100 | EmailNotificationHandler | Email delivery |
| 2200 | WebhookNotificationHandler | Webhook delivery |
| 2300 | AutoAddUpsellHandler | Auto-adds recommended upsells to baskets |
| 2300 | AutoAddRemovalTracker | Tracks removal of auto-added items |
| 3000 | UcpOrderWebhookHandler | UCP protocol webhooks |

```csharp
[NotificationHandlerPriority(1500)]
public class DigitalProductPaymentHandler : INotificationAsyncHandler<PaymentCreatedNotification> { }

[NotificationHandlerPriority(2200)]
public class WebhookNotificationHandler : INotificationAsyncHandler<OrderCreatedNotification> { }
```

### 8.3 Events by Domain

Standard CRUD Pattern: Creating✓/Created, Saving✓/Saved, Deleting✓/Deleted (✓ = cancelable)

| Domain | Events | Service |
|--------|--------|---------|
| Basket | Created, Clearing?/Cleared, ItemAdding?/Added, ItemRemoving?/Removed, QuantityChanging?/Changed | CheckoutService |
| BasketCurrency | Changing✓/Changed | CheckoutService |
| Order | Creating✓/Created, Saving✓/Saved, StatusChanging✓/Changed | InvoiceService |
| Invoice | Saving✓/Saved, Deleting✓/Deleted, Cancelling✓/Cancelled | InvoiceService |
| Payment | Creating✓/Created, Refunding✓/Refunded | PaymentService |
| Shipment | Creating✓/Created, Saving✓/Saved, StatusChanging✓/Changed | ShipmentService |
| Product | All 6 | ProductService |
| Customer | All 6 + PasswordResetRequested | CustomerService |
| CustomerSegment | All 6 | CustomerSegmentService |
| Discount | All 6 + StatusChanging✓/Changed | DiscountService |
| UpsellRule | All 6 + StatusChanging✓/Changed | UpsellService |
| SavedPaymentMethod | Creating✓/Created, Deleting✓/Deleted | SavedPaymentMethodService |
| Supplier | All 6 | SupplierService |
| Warehouse | All 6 | WarehouseService |
| TaxGroup | All 6 | TaxService |
| ShippingTaxOverride | All 6 | TaxService |
| ShippingOption | All 6 | ShippingService |

Inventory Events (InventoryService):
- StockReserving✓/Reserved, StockReleasing✓/Released, StockAllocating✓/Allocated, StockAdjusted, LowStock

Checkout Events:
- AddressesChanging✓/Changed, DiscountCodeApplying✓/Applied/Removed, ShippingSelectionChanging✓/Changed (CheckoutService)
- StockValidationFailed (CheckoutPaymentsApiController)

Order Grouping Events (IOrderGroupingStrategy):
- OrderGroupingModifying✓ - Before grouping is finalized (cancelable, allows modification)
- OrderGrouping - After grouping is complete

Abandoned Checkout Events:
- Abandoned (initial detection), Recovered, RecoveryConverted (AbandonedCheckoutService)
- AbandonedFirst, AbandonedReminder, AbandonedFinal (AbandonedCheckoutService scheduled job; AbandonedCheckoutApiController for manual send)

Reminder Events (InvoiceReminderJob):
- InvoiceReminder, InvoiceOverdue

Exchange Rate Events (ExchangeRateRefreshJob):
- ExchangeRatesRefreshedNotification - Rates successfully fetched
- ExchangeRateFetchFailedNotification - Fetch failed (includes ConsecutiveFailureCount for circuit-breaker patterns)

Digital Product Events (DigitalProductPaymentHandler):
- DigitalProductDelivered - Download links ready for delivery (triggers email/webhook)

Special Events:
- InvoiceAggregateChangedNotification - Fires on any Invoice/child change
- MerchelloCacheRefresherNotification - Distributed cache invalidation (Umbraco cache refresher)

Protocol Events:
- AgentAuthenticating✓/Authenticated - External agent authentication (AgentAuthenticationMiddleware)
- ProtocolSessionCreating✓/Created, ProtocolSessionUpdating✓/Updated, ProtocolSessionCompleting✓/Completed (UcpProtocolAdapter)
- ProtocolWebhookSending✓/Sent - Protocol webhook delivery (UcpOrderWebhookHandler)

Fulfilment Events:
- FulfilmentSubmitting✓/Submitted, SubmissionFailed (FulfilmentOrderSubmissionHandler, FulfilmentRetryJob)
- InventoryUpdated, ProductSynced (FulfilmentSyncService)
- Supplier Direct submission trigger policy:
  - `OnPaid`: submission attempted from payment-created workflow
  - `ExplicitRelease`: submission attempted only from `POST /orders/{orderId}/fulfillment/release`
  - Explicit release is paid-gated and Supplier Direct-only
  - Dynamic/non-Supplier Direct provider behavior is unchanged

### 8.4 Integration Points

Email and webhook integrations are external side-effect bridges and are fault-tolerant by design.
- `EmailNotificationHandler` runs at priority `2100`.
- `WebhookNotificationHandler` runs at priority `2200`.
- Both handlers catch/log dispatch failures and do not rethrow into core checkout/order flows.

Runtime bridge semantics currently wired:
- `basket.created` webhook is emitted from `BasketCreatedNotification` (published by `CheckoutService` after first basket persistence).
- `basket.updated` webhook is emitted from basket mutation notifications (`BasketItemAdded`, `BasketItemRemoved`, `BasketItemQuantityChanged`, `BasketCleared`).
- `customer.updated` is bridged by `CustomerSavedNotification` for both Email and Webhooks.
- Shipment email compatibility bridge: `ShipmentCreatedNotification` dispatches both `shipment.created` and `shipment.preparing`.

## 9. Integration Systems

### 9.1 Webhooks

Outbound webhook system. Shares infrastructure with Email via `OutboundDelivery`.

Flow:
```
Notification -> WebhookNotificationHandler (2200) -> IWebhookService.QueueDeliveryAsync()
    -> OutboundDelivery(Pending) -> DeliverAsync()
    -> atomic claim (Pending/Retrying -> Sending)
    -> IWebhookDispatcher.SendAsync() -> persist (Succeeded / Retrying / Abandoned)
```

Runtime behavior:
- Missing subscription during delivery is non-throwing and terminal (`Abandoned` with error persisted).
- Attempt numbering starts at the first send attempt, and retry delay indexing starts at `RetryDelaysSeconds[0]`.
- Pending recovery includes orphan `Pending` rows and due `Retrying` rows.
- Stale `Sending` rows are automatically re-queued to `Pending` after the max webhook timeout window plus grace.
- Timeout values are clamped and webhook payloads are size-limited (`Webhooks:MaxPayloadSizeBytes`).
- The named `Webhooks` `HttpClient` uses `Timeout.InfiniteTimeSpan`; request timeout is enforced per subscription via linked cancellation tokens.
- Payloads above max size are persisted as terminal rejected deliveries (`Abandoned`) without dispatch.

Background processing (`OutboundDeliveryJob`):
- Runs retry processing on the configured webhook interval.
- Cleans old webhook and email delivery logs using their respective retention windows.
- Cleanup excludes active rows (`Pending`, `Retrying`, `Sending`).

Delivery status semantics used by the Webhooks UI:
- `All` tab: no status filter.
- `Succeeded` tab: `Succeeded`.
- `Failed` tab: `Failed` + `Abandoned`.
- `Pending` tab: `Pending` + `Retrying`.

Deliveries API filter contract:
- `GET /webhooks/{id}/deliveries?status=Retrying` (single-status fallback).
- `GET /webhooks/{id}/deliveries?statuses=Pending&statuses=Retrying` (multi-status filtering).

Components:
- WebhookSubscription - URL, topic, auth, stats
- OutboundDelivery - Unified delivery record (DeliveryType: Webhook=0, Email=1)
- IWebhookService - CRUD, queue, retry, stats
- IWebhookDispatcher - HTTP dispatch + signature/auth headers
- IWebhookTopicRegistry - Topic registration
- WebhookNotificationHandler - Queues deliveries from internal notifications
- OutboundDeliveryJob - Retry processing + log retention cleanup

Topic coverage:
- `WebhookTopicRegistry` exposes 36 subscription topics across 11 categories:
  - Orders (4), Invoices (4), Products (3), Inventory (4), Customers (3), Shipments (2), Discounts (3), Checkout (6), Baskets (2), Digital Products (1), Fulfilment (4).
- All exposed webhook topics are mapped to live notifications by `WebhookNotificationHandler` and Startup registrations.
- `test.ping` is an internal test-send topic, not a subscription topic in the registry.

Auth Types: HmacSha256 (default, `X-Merchello-Hmac-SHA256`), HmacSha512, BearerToken, ApiKey, BasicAuth, None

Payload Format:
```json
{
  "id": "...",
  "topic": "order.created",
  "timestamp": "...",
  "api_version": "2024-01",
  "data": {}
}
```

Configuration:
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

Flow:
```
Notification -> EmailNotificationHandler (2100) -> IEmailConfigurationService.GetEnabledByTopicAsync()
    -> IEmailService.QueueDeliveryAsync() -> OutboundDeliveryJob
    -> IEmailService.DeliverAsync() -> Umbraco IEmailSender
```

Runtime bridge semantics:
- `CustomerSavedNotification` -> `customer.updated`.
- `ShipmentCreatedNotification` -> both `shipment.created` and `shipment.preparing`.
- `ShipmentStatusChangedNotification` routes to `shipment.shipped`, `shipment.delivered`, or `shipment.cancelled`.
- `PaymentCreatedNotification` dispatches to both `payment.created` and `invoice.paid`.
- `PaymentRefundedNotification` dispatches to both `payment.refunded` and `invoice.refunded`.

Retry and cleanup behavior:
- Queue entries start `Pending` (or `Failed` immediately when template rendering fails).
- Failed sends move to `Retrying` until `Email:MaxRetries` is reached, then terminal `Failed`.
- Outbound cleanup uses `Email:DeliveryRetentionDays` and excludes active rows (`Pending`, `Retrying`, `Sending`).

Components:
- EmailConfiguration - Email template config
- IEmailService - Queue and send
- IEmailConfigurationService - CRUD for configs
- IEmailTopicRegistry - 29 topics / 9 categories
- IEmailTokenResolver - Token replacement
- IEmailTemplateDiscoveryService - Find templates
- IEmailAttachmentResolver - Discovers and executes attachment generators
- EmailNotificationHandler - Queues emails

Topics:
- Orders, Invoices, Payments, Shipping, Customers, Inventory, Checkout, Digital Products, Fulfilment.

Tokens: {{order.customerEmail}}, {{order.billingAddress.name}}, {{store.name}}, {{store.websiteUrl}}

Configuration:
```json
{
  "Merchello": {
    "Email": {
      "Enabled": true,
      "TemplateViewLocations": [
        "/App_Plugins/Merchello/Views/Emails/{0}.cshtml",
        "/Views/Emails/{0}.cshtml"
      ],
      "DefaultFromAddress": null,
      "MaxRetries": 3,
      "RetryDelaysSeconds": [60, 300, 900],
      "DeliveryRetentionDays": 30
    }
  }
}
```
## 10. Factories

All domain objects are created via factories for consistency, thread safety, and proper initialization.

| Factory | Creates |
|---------|---------|
| InvoiceFactory | FromBasket(source?), CreateDraft() - Both set Invoice.Source for origin tracking |
| OrderFactory | Create(invoiceId, warehouseId, shippingOptionId, ...) |
| PaymentFactory | CreatePayment(), CreateManualPayment(), CreateRefund(), CreateManualRefund() |
| ShipmentFactory | Create(order, ...), Create(orderId, warehouseId, ...) |
| BasketFactory | Create(customerId, currencyCode, symbol) |
| ProductFactory | Create(productRoot, name, price, ...) |
| ProductRootFactory | Create(name, taxGroup, productType, options) |
| ProductOptionFactory | Create(params), CreateEmpty(), CreateEmptyValue() |
| LineItemFactory | CreateFromProduct(), CreateAddonForBasket(), CreateShippingLineItem(), CreateForOrder(), CreateAddonForOrder(), CreateDiscountForOrder(), CreateForShipment(), CreateDiscountLineItem(), CreateShipmentTrackingLineItem(), CreateCustomLineItem() |
| TaxGroupFactory | Create(name, taxPercentage) |
| CustomerFactory | CreateFromEmail(), Create(params) |
| CustomerSegmentFactory | Create(params), CreateMember() |
| DiscountFactory | Create(params), CreateTargetRule(), CreateEligibilityRule(), CreateBuyXGetYConfig(), CreateFreeShippingConfig() (sub-entities are JSON-stored POCOs) |
| DownloadLinkFactory | Create(params) - Creates secure download link with HMAC token |
| AddressFactory | Create(params) - Creates locality addresses |
| ProductCollectionFactory | Create(params) - Creates product collections |
| ProductFilterFactory | Create(params) - Creates product filters |
| ProductFilterGroupFactory | Create(params) - Creates product filter groups |
| ProductTypeFactory | Create(params) - Creates product types |
| ShippingOptionFactory | Create(params) - Creates shipping options |
| SupplierFactory | Create(params) - Creates supplier entities |
| WarehouseFactory | Create(params) - Creates warehouse entities |
| SavedPaymentMethodFactory | CreateFromVaultConfirmation() - Creates saved payment method from vault |
| UpsellFactory | Create(params) - Creates upsell rule entities |

## 11. Background Jobs

| Job | Purpose |
|-----|---------|
| DiscountStatusJob | Transitions discounts: Scheduled → Active → Expired |
| OutboundDeliveryJob | Processes webhook and email retry queue |
| AbandonedCheckoutDetectionJob | Detects abandoned carts, sends email sequence, expires old checkouts |
| InvoiceReminderJob | Sends payment reminders and overdue notices |
| FulfilmentPollingJob | Polls 3PLs for order status updates |
| FulfilmentRetryJob | Retries failed 3PL order submissions |
| FulfilmentCleanupJob | Cleans up old fulfilment sync and webhook logs |
| ExchangeRateRefreshJob | Periodically refreshes exchange rates from configured provider |
| UpsellStatusJob | Transitions upsell rules: Scheduled → Active → Expired; cleans up old analytics |

## 12. Caching

ICacheService wraps Umbraco AppCaches (distributed):

```csharp
GetOrCreateAsync(key, factory, ttl, tags)
RemoveAsync(key)
RemoveByTagAsync(tag)
distributedCache.ClearMerchelloCache("prefix")
```

Prefixes:
- merchello:exchange-rates:*
- merchello:locality:*
- merchello:shipping:*

Deduplication:
- Payment.IdempotencyKey - Prevents duplicate payment processing
- Payment.WebhookEventId - Prevents duplicate webhook processing

## 13. API Reference

### 13.1 Storefront API (/api/merchello/storefront)

Pre-checkout endpoints for basket, location, and availability.

Basket:
| Endpoint | Method | Description |
|----------|--------|-------------|
| /basket/add | POST | Add item to basket |
| /basket | GET | Get basket |
| /basket/count | GET | Get basket item count |
| /basket/update | POST | Update item quantity |
| /basket/{lineItemId} | DELETE | Remove item |
| /basket/availability | GET | Check basket availability |
| /basket/estimated-shipping | GET | Get estimated shipping |

Shipping & Location:
| Endpoint | Method | Description |
|----------|--------|-------------|
| /shipping/countries | GET | Get shipping countries |
| /shipping/country | GET/POST | Get/set shipping country |
| /shipping/countries/{code}/regions | GET | Get regions for country |

Currency:
| Endpoint | Method | Description |
|----------|--------|-------------|
| /currency | GET/POST | Get/set display currency |

Products:
| Endpoint | Method | Description |
|----------|--------|-------------|
| /products/{id}/availability | GET | Check product availability |

Payment Methods (Saved):
| Endpoint | Method | Description |
|----------|--------|-------------|
| /payment-methods | GET | List saved payment methods for current customer |
| /payment-methods/setup | POST | Create a vault setup session |
| /payment-methods/confirm | POST | Confirm setup and save payment method |
| /payment-methods/{id}/set-default | POST | Set default payment method |
| /payment-methods/{id} | DELETE | Delete a saved payment method |
| /payment-methods/providers | GET | Get vault-enabled payment providers |

Upsells:
| Endpoint | Method | Description |
|----------|--------|-------------|
| /upsells | GET | Get upsell suggestions for basket |
| /upsells/product/{productId} | GET | Get upsell suggestions for product page |
| /upsells/events | POST | Record upsell impression/click events |

### 13.2 Checkout API (/api/merchello/checkout)

Checkout flow endpoints.

Basket & Addresses:
| Endpoint | Method | Description |
|----------|--------|-------------|
| /basket | GET | Get checkout basket |
| /addresses | POST | Save addresses |
| /initialize | POST | Initialize checkout |
| /shipping/countries | GET | Get shipping countries |
| /shipping/regions/{code} | GET | Get shipping regions |
| /billing/countries | GET | Get billing countries |
| /billing/regions/{code} | GET | Get billing regions |

Shipping:
| Endpoint | Method | Description |
|----------|--------|-------------|
| /shipping-groups | GET | Get shipping groups |
| /shipping | POST | Save shipping selections |

Discounts:
| Endpoint | Method | Description |
|----------|--------|-------------|
| /discount/apply | POST | Apply discount code |
| /discount/{id} | DELETE | Remove discount |

Payments:
| Endpoint | Method | Description |
|----------|--------|-------------|
| /payment-methods | GET | Get payment methods |
| /payment-options | GET | Get checkout payment options (includes saved methods if logged in) |
| /pay | POST | Create payment session |
| /{invoiceId}/pay | POST | Create payment session for existing invoice |
| /{providerAlias}/create-order | POST | Create order for widget-based payment providers |
| /{providerAlias}/capture-order | POST | Capture widget-based payment order |
| /process-payment | POST | Process payment result |
| /process-direct-payment | POST | Process payment with direct card details |
| /process-saved-payment | POST | Process payment with saved method (includes ownership checks, idempotency key support, and ledger recording) |
| /worldpay/apple-pay-validate | POST | Validate Apple Pay merchant session (WorldPay) |
| /return | GET | Payment return callback |
| /cancel | GET | Payment cancel callback |

Express Checkout:
| Endpoint | Method | Description |
|----------|--------|-------------|
| /express-methods | GET | Get express methods |
| /express-config | GET | Get express SDK config |
| /express | POST | Process express checkout |
| /express-payment-intent | POST | Create express payment intent |

Authentication:
| Endpoint | Method | Description |
|----------|--------|-------------|
| /check-email | POST | Check if email exists |
| /validate-password | POST | Validate password |
| /sign-in | POST | Sign in customer |
| /forgot-password | POST | Initiate password reset (rate-limited, always returns success) |
| /validate-reset-token | POST | Validate password reset token |
| /reset-password | POST | Complete password reset with new password |

Password Reset Page:
| Route | Description |
|-------|-------------|
| /checkout/reset-password | MVC page for password reset form (validates token from email link) |

Recovery:
| Endpoint | Method | Description |
|----------|--------|-------------|
| /capture-email | POST | Capture email for recovery |
| /capture-address | POST | Capture address for recovery |
| /recover/{token} | GET | Restore from recovery link |
| /recover/{token}/validate | GET | Validate recovery token |

Post-purchase Upsells:
| Endpoint | Method | Description |
|----------|--------|-------------|
| /post-purchase/{invoiceId} | GET | Get post-purchase upsells for an invoice (requires confirmation-token cookie matching invoice ID) |
| /post-purchase/{invoiceId}/preview | POST | Preview adding a post-purchase item (requires confirmation-token cookie) |
| /post-purchase/{invoiceId}/add | POST | Add post-purchase item, charge saved method, and record payment (requires confirmation-token cookie) |
| /post-purchase/{invoiceId}/skip | POST | Skip post-purchase upsells (requires confirmation-token cookie) |

### 13.3 Webhook API

Payment Webhooks (public):
POST /umbraco/merchello/webhooks/payments/{providerAlias}

Fulfilment Webhooks (public):
POST /umbraco/merchello/webhooks/fulfilment/{providerKey}

Outbound Webhook Management (/api/v1/webhooks):
| Endpoint | Method | Description |
|----------|--------|-------------|
| / | GET/POST | List/create subscriptions |
| /{id} | GET/PUT/DELETE | Get/update/delete subscription |
| /{id}/test | POST | Send test webhook |
| /{id}/regenerate-secret | POST | Regenerate signing secret |
| /{id}/deliveries | GET | Get delivery history |
| /topics | GET | Get available topics |
| /topics/by-category | GET | Get topics by category |
| /deliveries/{id} | GET | Get delivery details |
| /deliveries/{id}/retry | POST | Retry delivery |
| /stats | GET | Get delivery stats |
| /ping | POST | Ping endpoint |

### 13.4 Protocol Discovery API (/.well-known)

Public endpoints for protocol discovery by external agents.

| Endpoint | Method | Description |
|----------|--------|-------------|
| /.well-known/{protocol} | GET | Get protocol manifest (e.g., /.well-known/ucp) |
| /.well-known/oauth-authorization-server | GET | OAuth 2.0 metadata (when Identity Linking enabled) |

Headers:
- UCP-Agent: profile="https://agent.example/profile", version="2026-01-23" - Agent identification for capability negotiation
- Request-Signature: RFC 7797 detached JWS signature over raw request payload (transactional routes)
- Request-Id: UUID trace identifier (transactional routes)
- Idempotency-Key: required on create/update/complete write operations

Response Headers:
- Cache-Control: public, max-age=3600 - Manifest caching

Authentication:
- Manifest endpoint is public (for discovery)
- Transactional protocol endpoints are always strict: missing/invalid required headers/signatures are rejected
- Manifest endpoint remains negotiable; header/auth validation failures are logged but do not block discovery

### 13.5 Downloads API (/api/merchello/downloads)

Secure file download endpoints for digital products.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /{token} | GET | None (token-based) | Download file using secure token |
| /customer | GET | Required | Get customer's download links |
| /invoice/{invoiceId} | GET | Required | Get download links for invoice |

Security:
- Download tokens are HMAC-SHA256 signed with constant-time validation
- Rate limited to 30 requests/minute per IP
- Customer ownership verified for authenticated endpoints

Token Format:
```
{linkId:N}-{base64UrlEncodedHmacSignature}
```

Response (Download):
- 200 OK - File stream with Content-Disposition: attachment
- 404 Not Found - Invalid or expired token
- 403 Forbidden - Max downloads reached
- 429 Too Many Requests - Rate limit exceeded

### 13.6 Admin API (/umbraco/backoffice/merchello/api)

Backoffice APIs for store management. All endpoints require Umbraco backoffice authentication.

| Category | Controllers |
|----------|-------------|
| Products | ProductsApiController, FiltersApiController, ProductTypesApiController, ProductCollectionsApiController, ProductFeedsApiController |
| Orders | OrdersApiController, ShippingOptionsApiController, ShipmentsApiController |
| Customers | CustomersApiController, CustomerSegmentsApiController |
| Payments | PaymentsApiController, SavedPaymentMethodsApiController, PaymentLinksApiController |
| Providers | PaymentProvidersApiController, ShippingProvidersApiController, TaxProvidersApiController, FulfilmentProvidersApiController, ExchangeRateProvidersApiController, AddressLookupProvidersApiController |
| Marketing | DiscountsApiController, UpsellsApiController, AbandonedCheckoutApiController |
| Configuration | SettingsApiController, TaxApiController, WarehousesApiController, SuppliersApiController |
| Notifications | EmailConfigurationApiController, WebhooksApiController, NotificationsApiController |
| Reporting | ReportingApiController |

Orders API highlight:
- `POST /orders/{orderId}/fulfillment/release` - explicit Supplier Direct release for paid orders when supplier trigger mode is `ExplicitRelease`

ProductFeedsApiController coverage:
- `GET /product-feeds`
- `GET /product-feeds/{id}`
- `POST /product-feeds`
- `PUT /product-feeds/{id}`
- `DELETE /product-feeds/{id}`
- `POST /product-feeds/{id}/rebuild`
- `POST /product-feeds/{id}/regenerate-token`
- `GET /product-feeds/{id}/preview`
- `POST /product-feeds/{id}/validate`
- `GET /product-feeds/resolvers`

### 13.7 OpenAPI / Swagger Documents

Merchello publishes two Swagger documents:

| Document Name | Purpose | Typical JSON URL |
|---------------|---------|------------------|
| `merchello` | Backoffice management APIs | `/umbraco/swagger/merchello/swagger.json` |
| `merchello-storefront` | Public storefront + checkout APIs for headless clients | `/umbraco/swagger/merchello-storefront/swagger.json` |

Typical Swagger UI URL: `/umbraco/swagger`

## 14. DTOs

DTOs are organized by domain module. See CLAUDE.md for naming conventions.

### DTO Organization by Domain

| Domain | Count | Key Types |
|--------|-------|-----------|
| Accounting | ~62 | InvoiceDto, OrderDto, LineItemDto, PaymentDto, StatementDto |
| Payments | ~62 | PaymentMethodDto, RefundDto, PaymentSessionDto, SavedPaymentMethodDto |
| Products | ~38 | ProductDto, VariantDto, ProductOptionDto, ProductTypeDto |
| Checkout | ~37 | BasketDto, CheckoutSessionDto, ShippingGroupDto, ShippingOptionDto |
| Shipping | ~33 | ShipmentDto, ShippingOptionDto, ShippingCostDto, ServiceRegionDto |
| Upsells | ~25 | UpsellDto, UpsellRuleDto, UpsellSuggestionDto, PostPurchaseUpsellsDto |
| Customers | ~19 | CustomerDto, CustomerSegmentDto, SegmentCriteriaDto |
| Discounts | ~16 | DiscountDto, DiscountRuleDto, DiscountUsageDto |
| Storefront | ~16 | StorefrontBasketDto, ProductAvailabilityDto, StorefrontCountryDto |
| Protocols/UCP | ~14 | UcpSessionDto, UcpOrderDto, UcpManifestDto |
| Fulfilment | ~9 | FulfilmentOrderDto, FulfilmentStatusDto, FulfilmentProviderDto |
| Warehouses | ~10 | WarehouseDto, ServiceRegionDto, StockDto |
| Webhooks | ~11 | WebhookSubscriptionDto, WebhookDeliveryDto, WebhookTopicDto |
| Email | ~14 | EmailConfigurationDto, EmailTemplateDto, EmailTokenDto |
| Reporting | ~5 | SalesBreakdownDto, DashboardStatsDto, OrderStatsDto |

## 15. Planned Features

### Subscriptions (Not Yet Implemented)

ISubscriptionService (Planned):
- CreateSubscriptionAsync() - Create subscription
- CancelSubscriptionAsync() - Cancel subscription
- PauseSubscriptionAsync() - Pause subscription
- ResumeSubscriptionAsync() - Resume subscription
- ProcessRenewalAsync() - Process renewal
- UpdateStatusFromProviderAsync() - Sync status from provider
- GetMetricsAsync() - Get subscription metrics

Entity Relationships (Planned):
```
Subscription → 1:1 → Customer, ProductRoot (IsSubscriptionProduct only)
Subscription → 1:N → SubscriptionInvoice → Invoice
```

Products with IsSubscriptionProduct = true purchased alone (one per basket).

SubscriptionFactory (Planned): Will create subscription entities.

### Other Planned Features

- Backorder - Orders when stock unavailable
- Partial Fulfillment - Ship partial orders
- Return/Restock - Return goods and restock inventory
- Basket Reservation Expiry - Expire reserved stock after timeout
- Checkout Group Consolidation - Merge groups when possible



