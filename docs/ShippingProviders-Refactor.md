# Dynamic External Shipping Provider Architecture

## Executive Summary

You're right - the current architecture has a fundamental flaw for external providers. The distinction is:

- **Manual/Flat Rate**: Admin-defined options, costs, weight tiers → current architecture is correct
- **External carriers (FedEx, UPS)**: Should be fully dynamic based on warehouse origin → customer destination → whatever the carrier API returns

This document outlines a comprehensive architectural change to make external providers fully dynamic.

---

## CRITICAL ISSUE: Order Grouping Does Not Call ShippingQuoteService

**This is the most important issue to understand before implementing this refactor.**

### The Problem

There are TWO completely separate flows for shipping in checkout that DO NOT integrate:

| Flow | Used For | Source of Costs | Works With External Providers? |
|------|----------|-----------------|-------------------------------|
| **ShippingQuoteService.GetQuotesAsync()** | Basket-level preview (`Basket.AvailableShippingQuotes`) | Provider APIs (FedEx, UPS, etc.) | YES |
| **DefaultOrderGroupingStrategy.GroupItemsAsync()** | Per-warehouse shipping selection (`OrderGroup.AvailableShippingOptions`) | `ShippingCostResolver.GetTotalShippingCost()` | **NO** - returns null/0 |

### Current Code Path (Order Grouping)

```csharp
// DefaultOrderGroupingStrategy.cs lines 209-218, 260-269, 296-305
AvailableShippingOptions = allowedShippingOptions.Select(so => new ShippingOptionInfo
{
    ShippingOptionId = so.Id,
    Name = so.Name ?? string.Empty,
    DaysFrom = so.DaysFrom,
    DaysTo = so.DaysTo,
    IsNextDay = so.IsNextDay,
    Cost = shippingCostResolver.GetTotalShippingCost(so, countryCode, stateCode) ?? 0,  // <-- RETURNS NULL FOR EXTERNAL PROVIDERS
    ProviderKey = so.ProviderKey
}).ToList()
```

### Why External Providers Show $0

1. `ShippingCostResolver.GetTotalShippingCost()` looks up costs from `ShippingOption.ShippingCosts` table
2. External providers (FedEx, UPS) don't have `ShippingCost` records - they fetch from APIs
3. `ShippingCostResolver` returns `null` for external providers
4. The `?? 0` fallback makes all external provider costs show as **$0**

### Impact

**External providers currently DO NOT WORK in the checkout order grouping flow.**
- The `Basket.AvailableShippingQuotes` from `ShippingQuoteService` is populated but NEVER used for order groups
- Users see shipping options with $0 cost for FedEx/UPS in checkout
- The infrastructure exists (`ShippingQuoteService`, FedEx/UPS providers with currency conversion) but is disconnected from order groups

### Required Fix

The refactor MUST bridge `ShippingQuoteService` → `OrderGroup.AvailableShippingOptions`. See [Integration Point](#integration-point-order-grouping--shipping-quotes) section below.

---

## Code Verification (Traced January 2026)

The following code paths were traced to verify the architectural issues described above:

### Verified: Order Grouping Never Calls ShippingQuoteService

**File:** `src/Merchello.Core/Checkout/Strategies/DefaultOrderGroupingStrategy.cs`

The strategy populates `AvailableShippingOptions` using only `ShippingCostResolver`:
```csharp
// Lines 209-218, 260-269, 296-305 - All three group creation paths use this pattern:
AvailableShippingOptions = allowedShippingOptions.Select(so => new ShippingOptionInfo
{
    ShippingOptionId = so.Id,
    Name = so.Name ?? string.Empty,
    DaysFrom = so.DaysFrom,
    DaysTo = so.DaysTo,
    IsNextDay = so.IsNextDay,
    Cost = shippingCostResolver.GetTotalShippingCost(so, context.ShippingAddress.CountryCode!,
        context.ShippingAddress.CountyState?.RegionCode) ?? 0,  // Returns NULL for external providers
    ProviderKey = so.ProviderKey
}).ToList()
```

**Confirmed:** No injection or call to `IShippingQuoteService` anywhere in this file.

### Verified: ShippingQuoteService Exists and Works

**File:** `src/Merchello.Core/Shipping/Services/ShippingQuoteService.cs`

The quote service correctly fetches rates from external providers:
```csharp
// Lines 117-134: External provider flow
if (provider.Metadata.ConfigCapabilities?.UsesLiveRates == true &&
    optionsByProvider.TryGetValue(providerKey, out var providerOptions))
{
    var serviceTypes = providerOptions
        .Where(o => !string.IsNullOrEmpty(o.ServiceType))
        .Select(o => o.ServiceType!)
        .Distinct()
        .ToList();

    if (serviceTypes.Count > 0)
    {
        var quote = await provider.Provider.GetRatesForServicesAsync(
            request, serviceTypes, providerOptions, cancellationToken);
        // Results returned but NEVER used by order grouping
    }
}
```

**Confirmed:** `GetQuotesForWarehouseAsync()` method does NOT exist - needs to be added.

### Verified: Model Gaps

**File:** `src/Merchello.Core/Shipping/Models/ShippingOptionInfo.cs`
```csharp
// Current properties - MISSING ServiceCode, SelectionKey
public Guid ShippingOptionId { get; set; }
public string Name { get; set; }
public int DaysFrom { get; set; }
public int DaysTo { get; set; }
public bool IsNextDay { get; set; }
public decimal Cost { get; set; }
public string ProviderKey { get; set; } = "flat-rate";
public string DeliveryTimeDescription { get; }  // Computed
```

**File:** `src/Merchello.Core/Checkout/Models/CheckoutSession.cs`
```csharp
// Current type - needs to change from Dict<Guid, Guid> to Dict<Guid, string>
public Dictionary<Guid, Guid> SelectedShippingOptions { get; set; } = [];
```

**File:** `src/Merchello.Core/Accounting/Models/Order.cs`
```csharp
// Current shipping fields - MISSING ShippingProviderKey, ShippingServiceCode, ShippingServiceName
public Guid ShippingOptionId { get; set; }
public decimal ShippingCost { get; set; }
public decimal? ShippingCostInStoreCurrency { get; set; }
public DateTime? RequestedDeliveryDate { get; set; }
// ExtendedData exists but should have explicit fields
```

### Verified: Multi-Currency Already Works

**File:** `src/Merchello.Core/Shipping/Providers/FedEx/FedExShippingProvider.cs`
```csharp
// Lines 358-364: Provider converts carrier rates → basket currency
var requestCurrency = request.CurrencyCode ?? _settings.StoreCurrencyCode;
if (!string.Equals(fedexCurrency, requestCurrency, StringComparison.OrdinalIgnoreCase))
{
    fedexToRequestRate = await _exchangeRateCache.GetRateAsync(fedexCurrency, requestCurrency, cancellationToken);
    if (!fedexToRequestRate.HasValue || fedexToRequestRate.Value <= 0m)
    {
        errors.Add($"No exchange rate available to convert FedEx rates from {fedexCurrency} to {requestCurrency}.");
    }
}
```

**Confirmed:** External providers already convert to `request.CurrencyCode`. No changes needed.

### Verified: Tax-Inclusive Display Already Works

**File:** `src/Merchello.Core/Checkout/Extensions/DisplayCurrencyExtensions.cs`
```csharp
// Lines 275-292: Applies shipping tax at display time
public static decimal GetDisplayShippingOptionCost(
    decimal cost,
    StorefrontDisplayContext displayContext,
    ICurrencyService currencyService)
{
    if (displayContext.DisplayPricesIncTax &&
        displayContext.IsShippingTaxable &&
        displayContext.ShippingTaxRate.HasValue)
    {
        var shippingTaxRate = displayContext.ShippingTaxRate.Value;
        return currencyService.Round(cost * (1 + (shippingTaxRate / 100m)) * rate, currency);
    }
    return currencyService.Round(cost * rate, currency);
}
```

**File:** `src/Merchello/Controllers/CheckoutApiController.cs`
```csharp
// Lines 1401-1414: Controller applies tax-inclusive display to all shipping options
var displayCost = DisplayCurrencyExtensions.GetDisplayShippingOptionCost(
    opt.Cost, effectiveContext, currencyService);
return new ShippingOptionDto
{
    Id = opt.ShippingOptionId,
    Name = opt.Name,
    Cost = displayCost,  // Tax-inclusive when setting enabled
    FormattedCost = displayCost.FormatWithSymbol(currencySymbol),
    // ...
};
```

**Confirmed:** Dynamic provider rates just need NET cost populated. Tax-inclusive display is applied automatically by the controller. No changes needed to tax handling.

### Verified: Frontend Uses option.id for Selection

**File:** `src/Merchello/wwwroot/js/checkout/components/checkout-shipping.js`
```javascript
// Line 102: Currently uses option.id - needs to change to option.selectionKey
selectOption(groupId, option) {
    this.$store.checkout?.setShippingSelection(groupId, option.id);
    // ...
}

// Line 129: Lookup by id - needs to change to selectionKey
getSelectedOption(group) {
    const selectedId = this.selections[group.groupId];
    return group.shippingOptions?.find(o => o.id === selectedId);
}
```

**Confirmed:** Frontend changes are minimal - just switch from `option.id` to `option.selectionKey`.

---

## User Concerns Validation Summary

| Concern | Status | Impact |
|---------|--------|--------|
| **1. Flat Rate Provider** | SAFE | No changes to FlatRateShippingProvider. It uses ShippingCostResolver which remains unchanged. The `HasDynamicServices = false` flag keeps it on existing path. |
| **2. Multi-Warehouse Checkout** | NEEDS WORK | Document now includes integration point for `DefaultOrderGroupingStrategy` ↔ `ShippingQuoteService`. See [Integration Point](#integration-point-order-grouping--shipping-quotes) section. |
| **3. Multi-Currency Checkout** | ALREADY WORKS | FedEx/UPS providers already convert to `request.CurrencyCode` via `IExchangeRateCache`. Currency passed through `Basket.Currency` → `ShippingQuoteRequest.CurrencyCode`. |
| **4. Tax-Inclusive Pricing** | ALREADY WORKS | `DisplayCurrencyExtensions.GetDisplayShippingOptionCost()` applies tax to any `ShippingOptionInfo.Cost`. Dynamic options will work automatically. See [Tax-Inclusive Display](#tax-inclusive-display-critical) section. |

---

## The Core Problem

FedEx themselves explicitly recommend **NOT hardcoding service types**:

> "Do not hardcode business rules like service types, package types, weight limits, etc. for shipments since they are subject to change. Moreover, to ensure flexibility and future-proofing, we recommend avoiding the hard-coding to specific enumeration values in API responses, as these values may change over time."
> — [FedEx Best Practices](https://developer.fedex.com/api/en-us/guides/best-practices.html)

---

## How Carriers Handle This

### FedEx: Service Availability API
FedEx provides a dedicated [Service Availability API](https://developer.fedex.com/api/en-us/catalog/service-availability/docs.html) that:
- Returns available services **dynamically** based on origin/destination
- Respects **account-level configuration** (some services require enablement)
- Returns packaging types, special services, transit times
- Is the **recommended** approach per FedEx documentation

### UPS: No Discovery API
UPS takes a different approach:
- No "discovery" endpoint that lists available services
- You must request a rate for a specific service
- If service is invalid for origin/destination, you get an error
- Documentation recommends "contacting UPS to retrieve valid service options per country"

---

## How Other Platforms Handle This

### Shopify
- Uses a **curated list** of FedEx services (Ground, 2Day, Priority Overnight, etc.)
- Limited to US domestic only for FedEx
- Appears to be hardcoded but likely refreshed with Shopify platform updates
- Not a great model for enterprise ecommerce

### Magento/WooCommerce
- Most plugins **hardcode** service types (same pattern as your current implementation)
- Recently forced to migrate from SOAP to REST APIs (Aug 2024)
- Third-party plugins offer more flexibility but still largely hardcoded
- Enterprise plugins are starting to use Service Availability API

---

## Current Merchello Architecture

From exploring the codebase:

```
FedExShippingProvider.cs
├── SupportedServiceTypes (static readonly list of 8 services)
├── ServiceTypeLookup (dictionary for O(1) lookup)
├── GetSupportedServiceTypesAsync() → returns static list
└── GetRatesAsync() → maps API responses to static ServiceType objects
```

**Problems with current approach:**
1. Service codes could change (FedEx has done this before)
2. Some services may not be available for specific accounts
3. Some services are region-specific (e.g., FEDEX_GROUND not available internationally)
4. New services can't be used without code deployment
5. Fulfilment mapping codes may become invalid

---

## Current Architecture Analysis

### What ShippingOption Does Today

From my codebase exploration, ShippingOptions serve multiple purposes for external providers:

| Purpose | How It Works | For External Providers |
|---------|--------------|----------------------|
| **Service Type Selection** | `ShippingOption.ServiceType = "FEDEX_GROUND"` | Controls which services to show |
| **Per-Warehouse Control** | Each warehouse has its own ShippingOptions | Different warehouses can offer different FedEx services |
| **Markup Configuration** | `ProviderSettings: { "markup": "10" }` | Apply 10% markup to carrier rates |
| **Delivery Day Overrides** | `DaysFrom`, `DaysTo` on ShippingOption | Override carrier estimates |
| **Product Assignment** | `Product.ShippingOptions` collection | Products link to specific options |
| **Product Restrictions** | `AllowedShippingOptions`, `ExcludedShippingOptions` | Products can limit to specific options |

### The Flaw

For external providers, ShippingOptions act as a **pre-defined allowlist** of service types:

```
Current Flow:
1. Admin creates ShippingOption with ServiceType="FEDEX_GROUND"
2. At checkout, system ONLY fetches rates for pre-configured service types
3. If FedEx adds new service → invisible until admin creates new ShippingOption
4. If FedEx removes service → dead ShippingOption with no rates
```

**This is backwards.** External providers should:
1. Query the carrier API for available services (based on origin/destination)
2. Return whatever the carrier supports
3. Let admin configure at provider/warehouse level, not per-service-type

---

## Proposed Architecture: Fully Dynamic External Providers

### Key Principle

**Manual providers (Flat Rate)**: Keep current architecture - admin defines everything
**External providers (FedEx, UPS)**: Dynamic - return whatever the carrier API returns

### Provider Capability Flag

Add a new capability to distinguish behavior:

```csharp
public record ProviderConfigCapabilities
{
    // Existing
    public bool HasLocationBasedCosts { get; init; }  // FlatRate: true
    public bool HasWeightTiers { get; init; }         // FlatRate: true
    public bool UsesLiveRates { get; init; }          // FedEx/UPS: true
    public bool RequiresGlobalConfig { get; init; }   // FedEx/UPS: true

    // NEW: Provider returns dynamic services based on origin/destination
    public bool HasDynamicServices { get; init; }     // FedEx/UPS: true, FlatRate: false
}
```

When `HasDynamicServices = true`:
- Don't require ShippingOptions with ServiceType
- At quote time, call carrier API with origin/destination
- Return ALL available services from carrier
- Apply warehouse-level configuration (markup, exclusions)

### IShippingProvider Interface Changes

Add new methods to support dynamic service discovery:

```csharp
public interface IShippingProvider
{
    // EXISTING methods (unchanged)
    ShippingProviderMetadata Metadata { get; }
    ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(...);
    ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetMethodConfigFieldsAsync(...);
    ValueTask<IReadOnlyList<ShippingServiceType>> GetSupportedServiceTypesAsync(...);  // Keep for backward compat
    ValueTask ConfigureAsync(ShippingProviderConfiguration? configuration, ...);
    bool IsAvailableFor(ShippingQuoteRequest request);
    Task<ShippingRateQuote?> GetRatesAsync(ShippingQuoteRequest request, ...);
    Task<ShippingRateQuote?> GetRatesForServicesAsync(...);  // Keep for backward compat
    Task<List<DateTime>> GetAvailableDeliveryDatesAsync(...);
    Task<decimal> CalculateDeliveryDateSurchargeAsync(...);
    Task<bool> ValidateDeliveryDateAsync(...);

    // NEW: Dynamic service discovery
    /// <summary>
    /// Discovers available services for a specific origin/destination route.
    /// Returns null if provider doesn't support dynamic discovery (use GetSupportedServiceTypesAsync instead).
    /// </summary>
    /// <param name="originCountryCode">Warehouse country (ISO 2-letter code)</param>
    /// <param name="originPostalCode">Warehouse postal/zip code</param>
    /// <param name="destinationCountryCode">Customer country</param>
    /// <param name="destinationPostalCode">Customer postal/zip code (optional for country-level check)</param>
    Task<IReadOnlyList<ShippingServiceType>?> GetAvailableServicesAsync(
        string originCountryCode,
        string originPostalCode,
        string destinationCountryCode,
        string? destinationPostalCode = null,
        CancellationToken cancellationToken = default);

    // NEW: Get rates for all available services (no pre-filtering)
    /// <summary>
    /// Fetches rates for ALL available services on the route.
    /// Used by dynamic providers instead of GetRatesForServicesAsync.
    /// </summary>
    /// <param name="request">The shipping quote request</param>
    /// <param name="warehouseConfig">Per-warehouse provider configuration (markup, exclusions)</param>
    Task<ShippingRateQuote?> GetRatesForAllServicesAsync(
        ShippingQuoteRequest request,
        WarehouseProviderConfig warehouseConfig,
        CancellationToken cancellationToken = default);
}
```

**Default implementations in `ShippingProviderBase`:**
- `GetAvailableServicesAsync` → returns `null` (signals: use static list)
- `GetRatesForAllServicesAsync` → calls `GetRatesAsync()`, applies config from `warehouseConfig`

### New Configuration Model

**Two-tier configuration for external providers:**

```
Global Config (existing)               Per-Warehouse Config (NEW)
┌────────────────────────────┐        ┌──────────────────────────────┐
│ ShippingProviderConfiguration │        │ WarehouseProviderConfig       │
├────────────────────────────┤        ├──────────────────────────────┤
│ ProviderKey: "fedex"       │        │ WarehouseId: <guid>          │
│ SettingsJson: {            │        │ ProviderKey: "fedex"         │
│   apiKey: "xxx",           │        │ IsEnabled: true              │
│   accountNumber: "yyy"     │        │ DefaultMarkupPercent: 10     │
│ }                          │        │ ExcludedServiceTypes: [...]  │
│ IsEnabled: true            │        │ ServiceMarkups: {...}        │
└────────────────────────────┘        └──────────────────────────────┘
         ↓                                      ↓
    Required first                     Per-warehouse customization
```

Replace per-service-type ShippingOptions with per-provider warehouse configuration:

```csharp
public class WarehouseProviderConfig
{
    public Guid Id { get; set; }
    public Guid WarehouseId { get; set; }
    public string ProviderKey { get; set; } = null!;  // "fedex", "ups"
    public bool IsEnabled { get; set; } = true;       // Enable/disable provider for this warehouse

    // Markup configuration
    public decimal DefaultMarkupPercent { get; set; } // Apply to all services (e.g., 10 = 10%)
    public string? ServiceMarkupsJson { get; set; }   // JSON: {"FEDEX_GROUND": 5, "FEDEX_2_DAY": 15}

    // Service exclusions (blocklist approach - allow everything except these)
    public string? ExcludedServiceTypesJson { get; set; }  // JSON: ["FIRST_OVERNIGHT", "PRIORITY_OVERNIGHT"]

    // Delivery time overrides (optional - use carrier estimates by default)
    public int? DefaultDaysFromOverride { get; set; }
    public int? DefaultDaysToOverride { get; set; }

    // Audit
    public DateTime CreateDate { get; set; } = DateTime.UtcNow;
    public DateTime UpdateDate { get; set; } = DateTime.UtcNow;

    // Computed properties (from JSON)
    public Dictionary<string, decimal> ServiceMarkups =>
        string.IsNullOrEmpty(ServiceMarkupsJson)
            ? []
            : JsonSerializer.Deserialize<Dictionary<string, decimal>>(ServiceMarkupsJson) ?? [];

    public List<string> ExcludedServiceTypes =>
        string.IsNullOrEmpty(ExcludedServiceTypesJson)
            ? []
            : JsonSerializer.Deserialize<List<string>>(ExcludedServiceTypesJson) ?? [];

    // Navigation (not mapped to JSON)
    public Warehouse? Warehouse { get; set; }
}

// Database constraints:
// - Primary key: Id
// - Unique constraint: (WarehouseId, ProviderKey) - one config per provider per warehouse
// - Foreign key: WarehouseId → merchelloWarehouses.Id
```

**Key change:** Instead of creating a ShippingOption for each FedEx service, admin:
1. Enables FedEx provider for the warehouse
2. Sets a default markup (e.g., 15%)
3. Optionally excludes specific services (e.g., exclude "FEDEX_FIRST_OVERNIGHT")
4. Optionally sets per-service markup overrides

### New Quote Flow for Dynamic Providers

```
Current Flow (with ShippingOptions):
┌─────────────────────────────────────────────────────────────────┐
│ 1. Get ShippingOptions for warehouse                            │
│ 2. Extract ServiceTypes: ["FEDEX_GROUND", "FEDEX_2_DAY"]       │
│ 3. Call FedEx API                                               │
│ 4. Filter response to ONLY requested service types              │
│ 5. Apply markup from each ShippingOption.ProviderSettings       │
│ 6. Return filtered rates                                        │
└─────────────────────────────────────────────────────────────────┘

Proposed Flow (dynamic):
┌─────────────────────────────────────────────────────────────────┐
│ 1. Get WarehouseProviderConfig for warehouse + "fedex"          │
│ 2. Call FedEx API with:                                         │
│    - Origin: warehouse address (from ShippingQuoteRequest)      │
│    - Destination: customer address                              │
│    - Packages: dimensions/weights from product config           │
│ 3. Receive ALL available services for that route                │
│ 4. Exclude services in ExcludedServiceTypes blocklist           │
│ 5. Apply DefaultMarkupPercent (or per-service override)         │
│ 6. Convert currency if needed (carrier → basket currency)       │
│ 7. Return ALL available rates                                   │
└─────────────────────────────────────────────────────────────────┘

**ShippingQuoteRequest already provides:**
- `OriginAddress` (warehouse address)
- `OriginWarehouseId`
- `DestinationAddress` / `CountryCode` / `PostalCode`
- `Packages` (with dimensions and weights)

### Multi-Warehouse Consideration

**Current Architecture Issue:**
The existing `ShippingQuoteService.GetQuotesAsync()` builds ONE request for the entire basket. But with multi-warehouse fulfillment:
- Product A ships from NYC warehouse
- Product B ships from LA warehouse
- Each needs separate carrier API calls with different origins

**How Order Grouping Works Today:**
```
DefaultOrderGroupingStrategy:
1. For each line item → SelectWarehouseForProduct()
2. Group items by WarehouseId
3. Each OrderGroup has its own AvailableShippingOptions
4. Multi-warehouse splits create multiple groups
```

**CURRENT PROBLEM:** DefaultOrderGroupingStrategy calls `ShippingCostResolver` directly, NOT `ShippingQuoteService`. This means:
- Flat-rate works (has ShippingCost records in DB)
- External providers show $0 (no ShippingCost records - they use live APIs)

### Integration Point: Order Grouping ↔ Shipping Quotes

**This is the core change required for the refactor to work.**

The `DefaultOrderGroupingStrategy` must be modified to call `ShippingQuoteService` for dynamic providers. Here is the recommended approach:

**Step 1: Add per-warehouse quote method to ShippingQuoteService**
```csharp
// IShippingQuoteService.cs - NEW METHOD
Task<IReadOnlyCollection<ShippingRateQuote>> GetQuotesForWarehouseAsync(
    Guid warehouseId,
    Address warehouseAddress,
    IReadOnlyCollection<ShipmentPackage> packages,
    string destinationCountry,
    string? destinationState,
    string? destinationPostal,
    string currency,
    CancellationToken ct = default);
```

**Step 2: Modify DefaultOrderGroupingStrategy to use ShippingQuoteService for dynamic providers**

```csharp
// DefaultOrderGroupingStrategy - NEW APPROACH
public class DefaultOrderGroupingStrategy(
    IWarehouseService warehouseService,
    IShippingCostResolver shippingCostResolver,
    IShippingQuoteService shippingQuoteService,  // NEW DEPENDENCY
    IShippingProviderManager providerManager,     // NEW DEPENDENCY
    ILogger<DefaultOrderGroupingStrategy> logger) : IOrderGroupingStrategy
{
    // After grouping items by warehouse, fetch quotes per group:
    private async Task PopulateShippingOptionsForGroupAsync(
        OrderGroup group,
        List<ShippingOption> warehouseShippingOptions,
        Address warehouseAddress,
        string destinationCountry,
        string? destinationState,
        string currency,
        CancellationToken ct)
    {
        List<ShippingOptionInfo> options = [];

        // 1. Get flat-rate options (from ShippingCostResolver - existing flow)
        var flatRateOptions = warehouseShippingOptions
            .Where(so => so.ProviderKey == "flat-rate")
            .Select(so => new ShippingOptionInfo
            {
                ShippingOptionId = so.Id,
                Name = so.Name ?? string.Empty,
                DaysFrom = so.DaysFrom,
                DaysTo = so.DaysTo,
                IsNextDay = so.IsNextDay,
                Cost = shippingCostResolver.GetTotalShippingCost(so, destinationCountry, destinationState) ?? 0,
                ProviderKey = so.ProviderKey
            });
        options.AddRange(flatRateOptions);

        // 2. Get dynamic provider options (from ShippingQuoteService - NEW)
        var packages = BuildPackagesForGroup(group);
        var quotes = await shippingQuoteService.GetQuotesForWarehouseAsync(
            group.WarehouseId,
            warehouseAddress,
            packages,
            destinationCountry,
            destinationState,
            null, // postal code
            currency,
            ct);

        // 3. Map quote service levels to ShippingOptionInfo
        foreach (var quote in quotes.Where(q => q.Metadata.ConfigCapabilities?.HasDynamicServices == true))
        {
            foreach (var level in quote.ServiceLevels)
            {
                options.Add(new ShippingOptionInfo
                {
                    ShippingOptionId = Guid.Empty,  // No ShippingOption record for dynamic
                    Name = level.ServiceName,
                    DaysFrom = (int)(level.TransitTime?.TotalDays ?? 0),
                    DaysTo = (int)(level.TransitTime?.TotalDays ?? 0),
                    IsNextDay = level.TransitTime?.TotalDays <= 1,
                    Cost = level.TotalCost,
                    ProviderKey = quote.ProviderKey,
                    ServiceCode = level.ServiceCode,           // NEW FIELD
                    EstimatedDeliveryDate = level.EstimatedDeliveryDate  // NEW FIELD
                });
            }
        }

        group.AvailableShippingOptions = options;
    }
}
```

**Step 3: Update ShippingOptionInfo model**
```csharp
public class ShippingOptionInfo
{
    // EXISTING
    public Guid ShippingOptionId { get; set; }     // For flat-rate (Guid.Empty for dynamic)
    public string Name { get; set; }
    public decimal Cost { get; set; }
    public int DaysFrom { get; set; }
    public int DaysTo { get; set; }
    public bool IsNextDay { get; set; }
    public string ProviderKey { get; set; } = "flat-rate";

    // NEW: For dynamic providers
    public string? ServiceCode { get; set; }       // "FEDEX_GROUND", "ups-03"
    public DateTime? EstimatedDeliveryDate { get; set; }

    // NEW: Unified selection key with prefix for safe parsing
    // Format: "so:{guid}" for flat-rate, "dyn:{provider}:{serviceCode}" for dynamic
    public string SelectionKey => ShippingOptionId != Guid.Empty
        ? $"so:{ShippingOptionId}"
        : $"dyn:{ProviderKey}:{ServiceCode}";

    public string DeliveryTimeDescription => IsNextDay
        ? "Next Day Delivery"
        : $"{DaysFrom}-{DaysTo} days";
}
```

**Step 3a: SelectionKey Parsing Helper**

The prefixed format (`so:` for ShippingOption, `dyn:` for dynamic) prevents edge cases where a service code might contain special characters:

```csharp
// File: src/Merchello.Core/Shipping/Extensions/SelectionKeyExtensions.cs
public static class SelectionKeyExtensions
{
    /// <summary>
    /// Parses a SelectionKey into its components.
    /// Returns (ShippingOptionId, ProviderKey, ServiceCode) where only one path is populated.
    /// </summary>
    public static bool TryParse(
        string? key,
        out Guid? shippingOptionId,
        out string? providerKey,
        out string? serviceCode)
    {
        shippingOptionId = null;
        providerKey = null;
        serviceCode = null;

        if (string.IsNullOrEmpty(key))
            return false;

        // New format: "so:{guid}" for flat-rate ShippingOption
        if (key.StartsWith("so:", StringComparison.Ordinal))
        {
            if (Guid.TryParse(key.AsSpan(3), out var guid))
            {
                shippingOptionId = guid;
                return true;
            }
            return false;
        }

        // New format: "dyn:{provider}:{serviceCode}" for dynamic providers
        if (key.StartsWith("dyn:", StringComparison.Ordinal))
        {
            var remainder = key.AsSpan(4);
            var colonIndex = remainder.IndexOf(':');
            if (colonIndex > 0)
            {
                providerKey = remainder[..colonIndex].ToString();
                serviceCode = remainder[(colonIndex + 1)..].ToString();
                return !string.IsNullOrEmpty(providerKey) && !string.IsNullOrEmpty(serviceCode);
            }
            return false;
        }

        // Legacy format: plain Guid (for backward compatibility during transition)
        if (Guid.TryParse(key, out var legacyGuid))
        {
            shippingOptionId = legacyGuid;
            return true;
        }

        return false;
    }

    /// <summary>
    /// Determines if the SelectionKey represents a dynamic provider selection.
    /// </summary>
    public static bool IsDynamicProvider(string? key)
        => key?.StartsWith("dyn:", StringComparison.Ordinal) == true;

    /// <summary>
    /// Determines if the SelectionKey represents a flat-rate ShippingOption.
    /// </summary>
    public static bool IsShippingOption(string? key)
        => key?.StartsWith("so:", StringComparison.Ordinal) == true
           || (key != null && Guid.TryParse(key, out _)); // Legacy format
}
```

**Step 3b: Update ShippingRateQuote model**

The existing `ShippingRateQuote` model needs additional properties:

```csharp
public class ShippingRateQuote
{
    // EXISTING
    public required string ProviderKey { get; init; }
    public required string ProviderName { get; init; }
    public IReadOnlyCollection<ShippingServiceLevel> ServiceLevels { get; init; } = [];
    public IDictionary<string, string>? ExtendedProperties { get; init; }
    public IReadOnlyCollection<string> Errors { get; init; } = [];

    // NEW: Provider metadata for downstream processing
    public ShippingProviderMetadata? Metadata { get; init; }

    // NEW: Indicates rates may not be current (from fallback cache)
    public bool IsFallbackRate { get; init; }
    public string? FallbackReason { get; init; }  // "carrier_api_unavailable", "rate_limit_exceeded"
}
```

**Why Metadata is needed on ShippingRateQuote:**
The `DefaultOrderGroupingStrategy` needs to check `HasDynamicServices` capability when processing quotes. By attaching `Metadata` to the quote, downstream code can determine how to handle the results without re-querying the provider manager.

**Step 4: Update selection storage**
```csharp
// OrderGroupingContext.cs
public Dictionary<Guid, string> SelectedShippingOptions { get; set; } = [];
// Key: GroupId
// Value: SelectionKey using prefixed format:
//   - "so:{guid}" for flat-rate ShippingOption
//   - "dyn:{provider}:{serviceCode}" for dynamic providers (e.g., "dyn:fedex:FEDEX_GROUND")

// ALSO UPDATE: LineItemShippingSelections for order edit flow
public Dictionary<Guid, (Guid WarehouseId, string SelectionKey)> LineItemShippingSelections { get; init; } = [];
// Changed from (Guid WarehouseId, Guid ShippingOptionId) to support dynamic providers
```

**Cache Key with Multi-Warehouse:**
```
// Per-warehouse cache (not per-basket)
merchello:shipping:quotes:{warehouseId}:{destination}:{currency}:{itemsHash}
```

This ensures:
- NYC warehouse → FedEx API with NYC origin → cached separately
- LA warehouse → FedEx API with LA origin → cached separately
- Same destination but different rates based on origin

### Product Restrictions: Simplified

**Key insight:** Multiple external providers CAN be active simultaneously (FedEx + UPS + Flat Rate). The system aggregates quotes from all enabled providers.

**Decision:** Product-level shipping restrictions should ONLY apply to manual (flat-rate) providers. For dynamic providers, products either allow them all or none.

Current model (complex, broken for dynamic):
```csharp
public class Product
{
    public ShippingRestrictionMode ShippingRestrictionMode { get; set; }
    public ICollection<ShippingOption> AllowedShippingOptions { get; set; }  // References static records
    public ICollection<ShippingOption> ExcludedShippingOptions { get; set; }
}
```

Proposed model (simplified):
```csharp
public class ProductRoot
{
    // NEW: Controls whether variants can use dynamic/external providers
    public bool AllowExternalCarrierShipping { get; set; } = true;  // Checked by default in UI
}

public class Product
{
    // For manual providers (flat-rate) - KEEP EXISTING
    // These reference ShippingOption records, which only exist for flat-rate now
    public ShippingRestrictionMode ShippingRestrictionMode { get; set; }
    public ICollection<ShippingOption> AllowedShippingOptions { get; set; }
    public ICollection<ShippingOption> ExcludedShippingOptions { get; set; }

    // Inherits AllowExternalCarrierShipping from ProductRoot
}
```

**UI:** Checkbox on ProductRoot shipping tab: "Allow external carrier shipping" (checked by default)

**Why this simplification works:**
1. Most products can ship via any carrier - no need to pick FedEx vs UPS
2. Warehouse-level config handles "don't offer overnight" scenarios (applies to ALL products from that warehouse)
3. If a product can't ship externally at all, uncheck `AllowExternalCarrierShipping` on ProductRoot
4. Per-product service exclusions (e.g., "large variant can't ship overnight") are out of scope for MVP - use warehouse-level exclusions as workaround

### Checkout Impact

**Current:** ShippingOptionInfo references ShippingOption.Id
**Proposed:** ShippingOptionInfo references provider + service code with prefixed SelectionKey

```csharp
public class ShippingOptionInfo
{
    // EXISTING fields
    public Guid ShippingOptionId { get; set; }     // For manual providers (keep for backward compat)
    public string Name { get; set; }
    public decimal Cost { get; set; }
    public int DaysFrom { get; set; }
    public int DaysTo { get; set; }
    public string ProviderKey { get; set; }        // ALREADY EXISTS - "flat-rate", "fedex", "ups"

    // NEW: For dynamic providers (alternative identifier when no ShippingOption exists)
    public string? ServiceCode { get; set; }       // "FEDEX_GROUND" - NEW
    public DateTime? EstimatedDeliveryDate { get; set; }  // From carrier API - NEW

    // NEW: Identifier used for selection (prefixed for safe parsing)
    public string SelectionKey => ShippingOptionId != Guid.Empty
        ? $"so:{ShippingOptionId}"
        : $"dyn:{ProviderKey}:{ServiceCode}";
}
```

**Selection storage changes:**
- Current: `CheckoutSession.SelectedShippingOptions = Dict<GroupId, ShippingOptionId>` (Guid → Guid)
- Proposed: `CheckoutSession.SelectedShippingOptions = Dict<GroupId, SelectionKey>` (Guid → string)
  - Where `SelectionKey` uses prefixed format: `"so:{guid}"` (flat-rate) or `"dyn:fedex:FEDEX_GROUND"` (dynamic)

**IMPORTANT:** This is a breaking change to the checkout session format. Since this is MVP with a clean database, existing sessions can be ignored. However, all code that reads/writes `SelectedShippingOptions` must be updated:
- `DefaultOrderGroupingStrategy.cs` (line 232, 237)
- `CheckoutService.SaveShippingSelectionsAsync()`
- `InvoiceService.CreateOrderFromBasketAsync()` (lines 228-237)

### InvoiceService Impact (Comprehensive)

The `InvoiceService` has extensive coupling to `ShippingOption` records. Here is the **complete list** of methods/areas requiring updates:

| Method/Area | Lines | Change Required |
|-------------|-------|-----------------|
| `CreateOrderFromBasketAsync` | 108-137, 228-240 | Parse SelectionKey, branch on `so:` vs `dyn:` prefix |
| `GetShippingOptionNamesAsync` | 1485-1494 | Return dynamic provider service name when `ShippingOptionId` is empty |
| Order listing queries | 1532-1533 | Handle orders without ShippingOption record |
| `BuildOrderDetailDto` | 2564 | Use `Order.ShippingServiceName` for dynamic, lookup for flat-rate |
| Edit order flow | 2272-2380 | Support reassigning to dynamic provider services |
| `CalculateShippingCost` | 544, 2336 | For dynamic: use stored cost; for flat-rate: lookup from ShippingOption |
| `CreateOrderFromCheckoutItems` | 2316-2380 | Handle cart items with dynamic provider selections |
| Shipment updates | 2986-3004 | Support orders without ShippingOption record |

**Key Implementation Pattern:**

```csharp
// In CreateOrderFromBasketAsync and similar methods
var selectionKey = checkoutSession.SelectedShippingOptions.GetValueOrDefault(group.GroupId);

if (SelectionKeyExtensions.TryParse(selectionKey, out var optionId, out var providerKey, out var serviceCode))
{
    if (optionId.HasValue)
    {
        // Flat-rate path: lookup ShippingOption as before
        var shippingOption = await db.ShippingOptions.FindAsync(optionId.Value);
        order.ShippingOptionId = optionId.Value;
        order.ShippingProviderKey = shippingOption?.ProviderKey;
        order.ShippingServiceCode = shippingOption?.ServiceType;
        order.ShippingServiceName = shippingOption?.Name;
    }
    else if (!string.IsNullOrEmpty(providerKey))
    {
        // Dynamic provider path: use values from SelectionKey
        order.ShippingOptionId = Guid.Empty;  // No ShippingOption record
        order.ShippingProviderKey = providerKey;
        order.ShippingServiceCode = serviceCode;
        order.ShippingServiceName = group.AvailableShippingOptions
            .FirstOrDefault(o => o.ServiceCode == serviceCode)?.Name ?? serviceCode;
    }
}
```

### Fulfilment Mapping

This actually becomes **cleaner**. Currently:
- ShippingOption.ServiceType → stored on order → passed to fulfilment

With dynamic:
- ServiceCode from carrier API → stored on order → passed to fulfilment
- No intermediate ShippingOption lookup needed

```csharp
// Order stores the selected shipping
public class Order
{
    // EXISTING (keep for flat-rate backward compat)
    public Guid ShippingOptionId { get; set; }

    // For dynamic providers - NEW
    public string? ShippingProviderKey { get; set; }    // "fedex"
    public string? ShippingServiceCode { get; set; }    // "FEDEX_GROUND"
    public string? ShippingServiceName { get; set; }    // "FedEx Ground" (for display)
    public decimal ShippingCost { get; set; }
}
```

**Fulfilment Provider Service Mapping:**

Fulfilment providers (ShipBob, ShipStation, etc.) need to map shipping service codes to their internal service types:

```csharp
// Example: ShipBobFulfilmentProvider handling dynamic shipping
public async Task<CreateOrderResult> CreateOrderAsync(Order order, ...)
{
    string? shipBobServiceId;

    if (!string.IsNullOrEmpty(order.ShippingServiceCode))
    {
        // Dynamic provider path - map carrier code to ShipBob service
        shipBobServiceId = order.ShippingProviderKey switch
        {
            "fedex" => MapFedExToShipBob(order.ShippingServiceCode),
            "ups" => MapUpsToShipBob(order.ShippingServiceCode),
            _ => null  // Let ShipBob determine service
        };
    }
    else if (order.ShippingOptionId != Guid.Empty)
    {
        // Flat-rate path - lookup ShippingOption.ServiceType
        var shippingOption = await GetShippingOption(order.ShippingOptionId);
        shipBobServiceId = shippingOption?.ServiceType != null
            ? MapServiceTypeToShipBob(shippingOption.ServiceType)
            : null;
    }

    // Pass to ShipBob API
    // ...
}

private static string? MapFedExToShipBob(string fedexCode) => fedexCode switch
{
    "FEDEX_GROUND" => "FedEx Ground",
    "FEDEX_2_DAY" => "FedEx 2Day",
    "PRIORITY_OVERNIGHT" => "FedEx Priority Overnight",
    _ => null  // Fallback: ShipBob selects cheapest
};
```

**Key Points for Fulfilment Integration:**
1. `ShippingProviderKey` + `ShippingServiceCode` identify the carrier service precisely
2. Fulfilment providers can create a mapping table for carrier → 3PL service codes
3. If no mapping exists, the fulfilment provider can default to cheapest/fastest
4. `ShippingServiceName` is for display only - always use `ShippingServiceCode` for logic

---

## Implementation Plan (MVP)

Since this is MVP with a clean database, we can make breaking changes.

> **IMPORTANT:** The implementation is split into two main stages:
> - **Stage A (Critical Path):** Makes external providers work AT ALL in checkout
> - **Stage B (Dynamic Improvements):** Makes providers truly dynamic (removes hardcoded service types)
>
> Stage A MUST be completed first. Stage B is an enhancement that can be done later.

---

## Stage A: Critical Path (Required First)

**Goal:** Connect `ShippingQuoteService` → `OrderGroup.AvailableShippingOptions` so external provider rates appear in checkout instead of $0.

### Phase A.1: SelectionKey Foundation

Create the parsing infrastructure for the new selection key format.

| Step | File | Task |
|------|------|------|
| A.1.1 | **NEW** `src/Merchello.Core/Shipping/Extensions/SelectionKeyExtensions.cs` | Create `TryParse()`, `IsDynamicProvider()`, `IsShippingOption()` helpers |
| A.1.2 | Write unit tests | Test parsing `so:{guid}`, `dyn:{provider}:{serviceCode}`, and legacy Guid formats |

```csharp
// SelectionKeyExtensions.cs
public static class SelectionKeyExtensions
{
    public static bool TryParse(string? key, out Guid? shippingOptionId, out string? providerKey, out string? serviceCode)
    {
        shippingOptionId = null; providerKey = null; serviceCode = null;
        if (string.IsNullOrEmpty(key)) return false;

        // New format: "so:{guid}"
        if (key.StartsWith("so:", StringComparison.Ordinal))
        {
            if (Guid.TryParse(key.AsSpan(3), out var guid))
            { shippingOptionId = guid; return true; }
            return false;
        }

        // New format: "dyn:{provider}:{serviceCode}"
        if (key.StartsWith("dyn:", StringComparison.Ordinal))
        {
            var remainder = key.AsSpan(4);
            var colonIndex = remainder.IndexOf(':');
            if (colonIndex > 0)
            {
                providerKey = remainder[..colonIndex].ToString();
                serviceCode = remainder[(colonIndex + 1)..].ToString();
                return !string.IsNullOrEmpty(providerKey) && !string.IsNullOrEmpty(serviceCode);
            }
            return false;
        }

        // Legacy: plain Guid
        if (Guid.TryParse(key, out var legacyGuid))
        { shippingOptionId = legacyGuid; return true; }

        return false;
    }

    public static bool IsDynamicProvider(string? key) => key?.StartsWith("dyn:", StringComparison.Ordinal) == true;
    public static bool IsShippingOption(string? key) => key?.StartsWith("so:", StringComparison.Ordinal) == true || (key != null && Guid.TryParse(key, out _));
}
```

### Phase A.2: Model Updates

Update models to support dynamic provider selections.

| Step | File | Task |
|------|------|------|
| A.2.1 | `src/Merchello.Core/Shipping/Models/ShippingOptionInfo.cs` | Add `ServiceCode`, `ServiceName`, `EstimatedDeliveryDate`, computed `SelectionKey` property |
| A.2.2 | `src/Merchello.Core/Checkout/Dtos/ShippingOptionDto.cs` | Add `SelectionKey`, `ServiceCode`, `EstimatedDeliveryDate`, `IsFallbackRate`, `FallbackReason` for API response |
| A.2.3 | `src/Merchello.Core/Checkout/Dtos/ShippingGroupDto.cs` | Change `SelectedShippingOptionId` from `Guid?` to `string?` (SelectionKey). Add `RateError`, `HasFallbackRates` for per-group error state |
| A.2.4 | `src/Merchello.Core/Checkout/Models/CheckoutSession.cs` | Change `SelectedShippingOptions` from `Dict<Guid, Guid>` to `Dict<Guid, string>` |
| A.2.5 | `src/Merchello.Core/Accounting/Models/Order.cs` | Add `ShippingProviderKey`, `ShippingServiceCode`, `ShippingServiceName`, `QuotedShippingCost`, `QuotedAt` |
| A.2.6 | `src/Merchello.Core/Accounting/Mapping/OrderDbMapping.cs` | Map new columns |
| A.2.7 | `src/Merchello.Core/Shipping/Providers/ShippingRateQuote.cs` | Add `Metadata` property for downstream processing |
| A.2.8 | Database migration | Add new columns to `merchelloOrders` table |

```csharp
// ShippingOptionInfo.cs additions
public string? ServiceCode { get; set; }              // "FEDEX_GROUND", "ups-03"
public string? ServiceName { get; set; }              // "FedEx Ground" (for display)
public DateTime? EstimatedDeliveryDate { get; set; }  // From carrier API
public bool IsFallbackRate { get; set; }              // true if rate is from cache due to API failure
public string? FallbackReason { get; set; }           // "carrier_api_unavailable", "rate_limit_exceeded"

public string SelectionKey => ShippingOptionId != Guid.Empty
    ? $"so:{ShippingOptionId}"
    : $"dyn:{ProviderKey}:{ServiceCode}";
```

### Phase A.3: ShippingQuoteService Integration

Add per-warehouse quote method and connect to order grouping.

| Step | File | Task |
|------|------|------|
| A.3.1 | `src/Merchello.Core/Shipping/Services/Interfaces/IShippingQuoteService.cs` | Add `GetQuotesForWarehouseAsync()` method signature |
| A.3.2 | `src/Merchello.Core/Shipping/Services/ShippingQuoteService.cs` | Implement `GetQuotesForWarehouseAsync()` - builds request, calls providers, returns quotes |
| A.3.3 | `src/Merchello.Core/Checkout/Strategies/DefaultOrderGroupingStrategy.cs` | Inject `IShippingQuoteService`, add `PopulateShippingOptionsForGroupAsync()` that calls quote service for dynamic providers |
| A.3.4 | Write integration tests | Test that external provider rates now appear in `OrderGroup.AvailableShippingOptions` |

```csharp
// IShippingQuoteService.cs addition
Task<IReadOnlyCollection<ShippingRateQuote>> GetQuotesForWarehouseAsync(
    Guid warehouseId,
    Address warehouseAddress,
    IReadOnlyCollection<ShipmentPackage> packages,
    string destinationCountry,
    string? destinationState,
    string? destinationPostal,
    string currency,
    CancellationToken ct = default);
```

### Phase A.4: Checkout & Order Flow

Update checkout service and order creation to handle SelectionKey format.

| Step | File | Task |
|------|------|------|
| A.4.1 | `src/Merchello.Core/Checkout/Services/CheckoutService.cs` | Update selection save/load to handle string SelectionKey |
| A.4.2 | `src/Merchello.Core/Checkout/Services/ShippingAutoSelector.cs` | Update return types from `Dict<Guid, Guid>` to `Dict<Guid, string>` |
| A.4.3 | `src/Merchello.Core/Checkout/Services/Parameters/SaveShippingSelectionsParameters.cs` | Update `Selections` type |
| A.4.4 | `src/Merchello/Controllers/CheckoutApiController.cs` | Map new DTO fields (`SelectionKey`, `ServiceCode`) to response |
| A.4.5 | `src/Merchello.Core/Accounting/Services/InvoiceService.cs` | Parse SelectionKey in `CreateOrderFromBasketAsync`, store provider/service on Order |
| A.4.6 | `src/Merchello.Core/Checkout/Services/CheckoutService.cs` | Store `QuotedShippingCosts` when shipping selection is saved (rate + timestamp) |
| A.4.7 | Write integration tests | End-to-end: basket → checkout → select dynamic option → order creation |

**Quote Preservation Pattern:**

When user selects a shipping option, store the quoted rate immediately to prevent price changes during checkout:

```csharp
// In CheckoutService.SaveShippingSelectionsAsync
foreach (var (groupId, selectionKey) in parameters.Selections)
{
    session.SelectedShippingOptions[groupId] = selectionKey;

    // Store the quoted rate for this selection
    var group = shippingGroups.FirstOrDefault(g => g.GroupId == groupId);
    var selectedOption = group?.AvailableShippingOptions
        .FirstOrDefault(o => o.SelectionKey == selectionKey);

    if (selectedOption != null)
    {
        session.QuotedShippingCosts[groupId] = (selectedOption.Cost, DateTime.UtcNow);
    }
}
```

The `InvoiceService.CreateOrderFromBasketAsync` should use the quoted rate (not re-fetch) when creating the order.

```csharp
// InvoiceService.cs pattern for CreateOrderFromBasketAsync
var selectionKey = checkoutSession.SelectedShippingOptions.GetValueOrDefault(group.GroupId);
if (SelectionKeyExtensions.TryParse(selectionKey, out var optionId, out var providerKey, out var serviceCode))
{
    if (optionId.HasValue)
    {
        // Flat-rate path
        var shippingOption = await db.ShippingOptions.FindAsync(optionId.Value);
        order.ShippingOptionId = optionId.Value;
        order.ShippingProviderKey = shippingOption?.ProviderKey;
        order.ShippingServiceCode = shippingOption?.ServiceType;
        order.ShippingServiceName = shippingOption?.Name;
    }
    else if (!string.IsNullOrEmpty(providerKey))
    {
        // Dynamic provider path
        order.ShippingOptionId = Guid.Empty;
        order.ShippingProviderKey = providerKey;
        order.ShippingServiceCode = serviceCode;
        order.ShippingServiceName = group.AvailableShippingOptions
            .FirstOrDefault(o => o.ServiceCode == serviceCode)?.Name ?? serviceCode;
    }
}
```

### Phase A.5: Frontend Updates (Minimal)

Update frontend to use SelectionKey instead of option.id, and add loading state UX.

| Step | File | Task |
|------|------|------|
| A.5.1 | `src/Merchello/wwwroot/js/checkout/stores/checkout.store.js` | Update JSDoc typedefs to include `selectionKey` |
| A.5.2 | `src/Merchello/wwwroot/js/checkout/components/checkout-shipping.js` | Change `option.id` → `option.selectionKey` in `selectOption()` and `getSelectedOption()` |
| A.5.3 | `src/Merchello/wwwroot/js/checkout/services/api.js` | Verify `saveShipping()` accepts string values (should already work) |
| A.5.4 | Checkout Razor partial / `checkout-shipping.js` | Add skeleton loader HTML for loading state (see [Loading State UX](#checkout-loading-state-ux-critical)) |
| A.5.5 | `checkout.css` or equivalent | Add skeleton loader CSS animations |
| A.5.6 | `single-page-checkout.js` orchestrator | Wrap API calls with `setShippingLoading(true/false)` and timeout handling (8s warning, 15s error) |
| A.5.7 | `checkout.store.js` | Add screen reader announcement in `setShippingLoading()` method |

```javascript
// checkout-shipping.js updates
selectOption(groupId, option) {
    // CHANGED: Use selectionKey instead of id
    this.$store.checkout?.setShippingSelection(groupId, option.selectionKey);
    this.$dispatch('shipping-selection-changed', {
        groupId,
        selectionKey: option.selectionKey,  // CHANGED from optionId
        option
    });
}

getSelectedOption(group) {
    const selectedKey = this.selections[group.groupId];
    if (!selectedKey) return undefined;
    // CHANGED: Match by selectionKey
    return group.shippingOptions?.find(o => o.selectionKey === selectedKey);
}
```

> **NOTE:** No changes needed to `checkout.store.js` for multi-currency or tax-inclusive display.
> These are handled server-side by `GetDisplayShippingOptionCost()` in the controller.

### Phase A.6: Testing & Verification

| Step | Task |
|------|------|
| A.6.1 | Unit test `SelectionKeyExtensions` parsing |
| A.6.2 | Integration test: basket with FedEx/UPS provider shows rates > $0 |
| A.6.3 | Integration test: select dynamic option, complete checkout, verify Order has provider/service fields |
| A.6.4 | Manual test: multi-currency checkout with dynamic provider |
| A.6.5 | Manual test: tax-inclusive display with dynamic provider |

---

## Stage B: Dynamic Provider Improvements (Enhancement)

**Goal:** Remove hardcoded service types from providers. Let carrier APIs determine available services dynamically.

> **Prerequisite:** Stage A must be complete before starting Stage B.

### Phase B.1: Capability Flag & Configuration Model

| Step | File | Task |
|------|------|------|
| B.1.1 | `src/Merchello.Core/Shipping/Providers/ProviderConfigCapabilities.cs` | Add `HasDynamicServices` property |
| B.1.2 | **NEW** `src/Merchello.Core/Shipping/Models/WarehouseProviderConfig.cs` | Create model for per-warehouse provider settings |
| B.1.3 | **NEW** `src/Merchello.Core/Shipping/Mapping/WarehouseProviderConfigDbMapping.cs` | EF Core mapping |
| B.1.4 | Database migration | Create `merchelloWarehouseProviderConfigs` table |
| B.1.5 | **NEW** `src/Merchello.Core/Shipping/Services/WarehouseProviderConfigService.cs` | CRUD service |

```csharp
// ProviderConfigCapabilities.cs addition
public bool HasDynamicServices { get; init; }  // FedEx/UPS: true, FlatRate: false
```

### Phase B.2: Provider Interface Updates

| Step | File | Task |
|------|------|------|
| B.2.1 | `src/Merchello.Core/Shipping/Providers/Interfaces/IShippingProvider.cs` | Add `GetAvailableServicesAsync()`, `GetRatesForAllServicesAsync()` methods |
| B.2.2 | `src/Merchello.Core/Shipping/Providers/ShippingProviderBase.cs` | Add default implementations (returns null/calls existing methods) |
| B.2.3 | `src/Merchello.Core/Shipping/Providers/BuiltIn/FlatRateShippingProvider.cs` | Set `HasDynamicServices = false` |

### Phase B.3: FedEx Dynamic Implementation

| Step | File | Task |
|------|------|------|
| B.3.1 | `src/Merchello.Core/Shipping/Providers/FedEx/FedExApiClient.cs` | Add Service Availability API endpoint |
| B.3.2 | `src/Merchello.Core/Shipping/Providers/FedEx/FedExShippingProvider.cs` | Implement `GetAvailableServicesAsync()` with fallback to static list |
| B.3.3 | `src/Merchello.Core/Shipping/Providers/FedEx/FedExShippingProvider.cs` | Implement `GetRatesForAllServicesAsync()` |
| B.3.4 | Set `HasDynamicServices = true` in metadata |

### Phase B.4: UPS Dynamic Implementation

| Step | File | Task |
|------|------|------|
| B.4.1 | `src/Merchello.Core/Shipping/Providers/UPS/UpsShippingProvider.cs` | Implement "request all, filter errors" approach |
| B.4.2 | `src/Merchello.Core/Shipping/Providers/UPS/UpsShippingProvider.cs` | Implement `GetRatesForAllServicesAsync()` |
| B.4.3 | Set `HasDynamicServices = true` in metadata |

### Phase B.5: ShippingQuoteService Dynamic Flow

| Step | File | Task |
|------|------|------|
| B.5.1 | `src/Merchello.Core/Shipping/Services/ShippingQuoteService.cs` | Update `FetchQuotesFromProvidersAsync` to detect `HasDynamicServices` |
| B.5.2 | For dynamic providers, call `GetRatesForAllServicesAsync()` with `WarehouseProviderConfig` |
| B.5.3 | Apply exclusions and markup from warehouse config |

### Phase B.6: Product Restrictions

| Step | File | Task |
|------|------|------|
| B.6.1 | `src/Merchello.Core/Products/Models/ProductRoot.cs` | Add `AllowExternalCarrierShipping` property (default true) |
| B.6.2 | `src/Merchello.Core/Products/Mapping/ProductRootDbMapping.cs` | Map new column |
| B.6.3 | `src/Merchello.Core/Checkout/Strategies/DefaultOrderGroupingStrategy.cs` | Filter dynamic options if `AllowExternalCarrierShipping = false` |

### Phase B.7: Admin UI

| Step | File | Task |
|------|------|------|
| B.7.1 | **NEW** `src/Merchello/Client/src/shipping/` | Create WarehouseProviderConfig management component |
| B.7.2 | Update provider setup UI | Enable per-warehouse, set markup, exclude services |
| B.7.3 | Product shipping tab | Add "Allow external carrier shipping" checkbox |

### Phase B.8: Feature Flag (Optional)

| Step | File | Task |
|------|------|------|
| B.8.1 | `appsettings.json` | Add `Merchello:Shipping:UseDynamicExternalProviders` flag |
| B.8.2 | `src/Merchello.Core/Shipping/Services/ShippingQuoteService.cs` | Check flag before using dynamic flow |

---

## Legacy Implementation Plan Reference

The following sections describe the implementation details referenced above:

### FedEx Dynamic Implementation Details

1. Implement `GetAvailableServicesAsync()` using [Service Availability API](https://developer.fedex.com/api/en-us/catalog/service-availability/docs.html)
   - Call with origin (warehouse address) + destination (customer address)
   - Cache results per `{originCountry}:{originPostal}:{destCountry}` (1hr TTL)
   - Returns list of available service types for that route
   - Handle API errors gracefully (see Fallback Strategy below)

2. Implement `GetRatesForAllServicesAsync()`:
   - Call Rate API without specifying service types (returns all available rates)
   - Apply `WarehouseProviderConfig.ExcludedServiceTypes` filter
   - Apply markup from `WarehouseProviderConfig.DefaultMarkupPercent` or `ServiceMarkups`
   - **Preserve currency conversion** (convert carrier currency to request currency)

### UPS Dynamic Implementation Details

UPS does NOT have a service availability API. Use "request all, filter errors" approach:

1. Implement `GetAvailableServicesAsync()`:
   - Maintain a comprehensive master list of ALL UPS service codes (domestic + international)
   - For each service, make a lightweight validation call or use known country restrictions
   - Cache valid services per origin/destination country pair (1hr TTL)
   - **Alternative**: Return `null` to signal "no dynamic discovery" and rely on rate-time filtering

2. Implement `GetRatesForAllServicesAsync()`:
   - Request rates for ALL services in a single API call
   - UPS API returns rates only for valid services (invalid services are omitted, not errors)
   - Apply warehouse config (exclusions, markup)
   - **Preserve currency conversion**

3. **UPS Master Service List** (keep updated from UPS documentation):
   ```csharp
   // Domestic US
   "14" (Next Day Air Early), "01" (Next Day Air), "13" (Next Day Air Saver),
   "59" (2nd Day Air A.M.), "02" (2nd Day Air), "12" (3 Day Select), "03" (Ground)
   // International
   "07" (Worldwide Express), "54" (Worldwide Express Plus), "08" (Worldwide Expedited),
   "65" (Worldwide Saver), "11" (Standard), "96" (Worldwide Express Freight)
   ```

### Fallback Static List Storage

Keep fallback service lists **inside the provider class** (not in configuration). Rationale:
- Fallback is truly last-resort, rarely used
- Lists are carrier-specific constants, not user-configurable
- Simpler than adding configuration UI for fallback scenarios

```csharp
// FedExShippingProvider.cs
private static readonly IReadOnlyList<ShippingServiceType> FallbackServiceTypes =
[
    new ShippingServiceType { Code = "FEDEX_GROUND", DisplayName = "FedEx Ground", ProviderKey = "fedex" },
    new ShippingServiceType { Code = "FEDEX_2_DAY", DisplayName = "FedEx 2Day", ProviderKey = "fedex" },
    // ... other common services
];

// Used in GetAvailableServicesAsync when Service Availability API fails:
public override async Task<IReadOnlyList<ShippingServiceType>?> GetAvailableServicesAsync(...)
{
    try
    {
        return await FetchFromServiceAvailabilityApiAsync(...);
    }
    catch (HttpRequestException ex)
    {
        _logger.LogWarning(ex, "FedEx Service Availability API failed, using fallback");
        return FallbackServiceTypes; // Return static list as fallback
    }
}

---

## Design Decisions (Resolved)

### 1. Caching Strategy

| Cache Type | Key Components | TTL | Purpose |
|------------|----------------|-----|---------|
| **Rate Quotes** | warehouse ID + destination + currency + packages hash | 10 min | Avoid repeated API calls during checkout |
| **Service Availability** | origin country + dest country | 1 hr | FedEx Service Availability API results |
| **Fallback Rates** | warehouse ID + destination + provider | 4 hr | Last-known rates when API unavailable |

**Rate Quote Cache Key Structure (per-warehouse):**
```
merchello:shipping:quotes:{warehouseId}:{destination}:{currency}:{packagesHash}
```

Note: Cache is per-warehouse, NOT per-basket. This means:
- Multiple baskets shipping from same warehouse to same destination share cached rates
- Packages hash ensures different package dimensions/weights get separate cache entries

**Why warehouse ID matters:**
- Same basket shipped from different warehouses = different rates
- Carrier APIs calculate rates based on origin (warehouse) → destination
- FedEx Ground from NYC warehouse ≠ FedEx Ground from LA warehouse

**Current implementation note:** The existing `BuildCacheKey` doesn't include warehouse ID explicitly (relies on product content hash). For the refactor, we should make this explicit since dynamic providers are per-warehouse.

**Service Availability cache:** The caching granularity is a trade-off:

| Granularity | Pros | Cons |
|-------------|------|------|
| `originCountry:destCountry` | Minimal cache entries, fast lookups | May miss postal-specific services |
| `originCountry:originPostal:destCountry` | More accurate for FedEx | ~10x more cache entries |
| `originCountry:originPostal:destCountry:destPostal` | Maximum accuracy | Cache explosion, rarely needed |

**Recommendation:** Use `originCountry:originPostal:destCountry` level. FedEx service availability CAN vary by origin postal code (e.g., some Express services only available from certain hubs). The cache key is still manageable since origin postal codes are limited to warehouse addresses.

```
// Service Availability Cache Key
merchello:shipping:service-availability:{originCountry}:{originPostal}:{destCountry}
// Example: merchello:shipping:service-availability:US:10001:CA
```

**Cache Invalidation Triggers:**
| Event | Invalidation Scope |
|-------|-------------------|
| `WarehouseProviderConfig` updated (exclusions, markup) | All rate quotes for that warehouse + provider |
| `ShippingProviderConfiguration` updated (API credentials) | All rate quotes for that provider across all warehouses |
| Warehouse address changed | All rate quotes for that warehouse |
| Exchange rate updated | All rate quotes in affected currency pairs |

**Implementation:** Use `INotificationService` with `WarehouseProviderConfigModifiedNotification` to trigger cache eviction via `ICacheService.Remove(pattern)`.

**Notification Classes:**

```csharp
// File: src/Merchello.Core/Shipping/Notifications/WarehouseProviderConfigModifiedNotification.cs
public record WarehouseProviderConfigModifiedNotification(
    Guid WarehouseId,
    string ProviderKey,
    WarehouseProviderConfigModificationType ModificationType) : INotification;

public enum WarehouseProviderConfigModificationType { Created, Updated, Deleted }

// Handler registration in ShippingQuoteService constructor:
// notificationService.Subscribe<WarehouseProviderConfigModifiedNotification>(OnWarehouseProviderConfigModified);
```

### 2. API Fallback Behavior
**Decision: Graceful degradation with transparency**

```
API Call Flow:
1. Try live API call
   ├── Success → Cache result, return rates
   └── Failure → Check fallback cache
                 ├── Fallback exists → Return with "prices may vary" flag
                 └── No fallback → Return static service list with estimates
```

**Fallback indicators added to response:**
```csharp
public class ShippingRateQuote
{
    // ... existing fields ...

    // NEW: Indicates rates may not be current
    public bool IsFallbackRate { get; init; }
    public string? FallbackReason { get; init; }  // "carrier_api_unavailable", "rate_limit_exceeded"
}
```

**UI should display:** "Prices shown are estimates. Final price confirmed at checkout."

### 3. Error Handling & Edge Cases

| Scenario | Behavior |
|----------|----------|
| Carrier API timeout (>5s) | Use fallback cache, log warning |
| Carrier API 500 error | Use fallback cache, log error |
| Rate limit exceeded | Use fallback cache for 15 min, then retry |
| No services available for route | Return empty list with clear message |
| All services excluded by config | Return empty list (admin configuration issue) |
| Currency conversion unavailable | Return error (don't show rates in wrong currency) |
| Invalid API credentials | Return error with setup instructions link |

**Logging requirements:**
- Log all API failures with correlation ID
- Log fallback usage for monitoring
- Alert on sustained API failures (>3 failures in 5 min)

### 4. Product-level Restrictions
**Decision: Provider-level only (simplified)**
- Products can only toggle `AllowDynamicProviders` (true/false)
- Per-provider or per-service exclusions not needed for MVP
- Warehouse-level config handles service exclusions

### 5. Migration Approach
**Decision: Clean break (MVP)**
- This is MVP - database will be reset
- No migration tooling needed
- Remove old ShippingOption-based external provider code
- Keep ShippingOption model only for flat-rate provider

### 6. ShippingOption Model Changes
**What stays:** ShippingOption continues to exist for flat-rate providers with all current fields:
- `Name`, `FixedCost`, `DaysFrom`, `DaysTo`, `ShippingCosts`, `WeightTiers`, etc.
- `ProviderKey = "flat-rate"` (explicitly set)
- `ServiceType = null` (not used for flat-rate)

**What changes for external providers:**
- No longer create ShippingOptions with `ProviderKey = "fedex"` or `"ups"`
- Use `WarehouseProviderConfig` instead
- Existing external provider ShippingOptions are ignored/obsolete

**ShippingQuoteService behavior:**
- For `HasDynamicServices = true` providers: Skip ShippingOption lookup entirely
- For `HasDynamicServices = false` providers (flat-rate): Use existing ShippingOption flow

### 7. Product Restriction Behavior

When `ProductRoot.AllowExternalCarrierShipping = false`:
- Dynamic provider quotes are excluded for ALL variants of this product
- Flat-rate ShippingOptions still apply (can use existing restriction modes)
- If basket contains mixed products, the restrictive product dictates available options for its line items

**IMPORTANT: Mixed Basket - Intersection Rule**

When a single `OrderGroup` contains products with **different** `AllowExternalCarrierShipping` values, the group shows the **intersection** of available options (most restrictive wins). This is consistent with how existing `AllowedShippingOptions`/`ExcludedShippingOptions` work.

**Mixed basket example:**
```
Basket:
- Product A (AllowExternalCarrierShipping = true) → FedEx + Flat Rate
- Product B (AllowExternalCarrierShipping = false) → Flat Rate only

If order grouping puts both in same group (same warehouse):
- Group shows intersection: Flat Rate only (most restrictive)
- Rationale: All items in a group ship together, so ALL items must support the shipping method

If order grouping separates by product (different warehouses):
- Group A (Warehouse 1): FedEx + Flat Rate
- Group B (Warehouse 2): Flat Rate only
```

**Implementation in `PopulateShippingOptionsForGroupAsync`:**
```csharp
// Check if ANY product in the group disallows external carriers
var allAllowExternal = group.LineItems
    .All(li => context.Products.GetValueOrDefault(li.ProductId)?.ProductRoot?.AllowExternalCarrierShipping != false);

if (!allAllowExternal)
{
    // Filter out dynamic provider options
    options = options.Where(o => !SelectionKeyExtensions.IsDynamicProvider(o.SelectionKey)).ToList();
}
```

---

## Files To Modify

> **Note:** Files are organized by implementation phase. See [Implementation Plan (MVP)](#implementation-plan-mvp) for the full phase breakdown.

### Stage A: Critical Path Files

These files MUST be modified to make external providers work in checkout.

#### Phase A.1: SelectionKey Foundation
| File | Changes |
|------|---------|
| **NEW** `src/Merchello.Core/Shipping/Extensions/SelectionKeyExtensions.cs` | SelectionKey parsing helper with `TryParse`, `IsDynamicProvider`, `IsShippingOption` methods |

#### Phase A.2: Model Updates
| File | Changes |
|------|---------|
| `src/Merchello.Core/Shipping/Models/ShippingOptionInfo.cs` | Add `ServiceCode`, `ServiceName`, `EstimatedDeliveryDate`, computed `SelectionKey` property |
| `src/Merchello.Core/Checkout/Dtos/ShippingOptionDto.cs` | Add `SelectionKey`, `ServiceCode`, `EstimatedDeliveryDate` for API response |
| `src/Merchello.Core/Checkout/Dtos/ShippingGroupDto.cs` | Change `SelectedShippingOptionId` from `Guid?` to `string?` (SelectionKey) |
| `src/Merchello.Core/Checkout/Strategies/Models/OrderGroup.cs` | Change `SelectedShippingOptionId` from `Guid?` to `string?` (SelectionKey) |
| `src/Merchello.Core/Checkout/Models/CheckoutSession.cs` | Change `SelectedShippingOptions` from `Dict<Guid, Guid>` to `Dict<Guid, string>`. Add `QuotedShippingCosts` `Dict<Guid, (decimal, DateTime)>` for rate preservation |
| `src/Merchello.Core/Accounting/Models/Order.cs` | Add `ShippingProviderKey`, `ShippingServiceCode`, `ShippingServiceName`, `QuotedShippingCost`, `QuotedAt` |
| `src/Merchello.Core/Accounting/Mapping/OrderDbMapping.cs` | Map new columns |
| `src/Merchello.Core/Shipping/Providers/ShippingRateQuote.cs` | Add `Metadata` property for downstream processing |

#### Phase A.3: ShippingQuoteService Integration
| File | Changes |
|------|---------|
| `src/Merchello.Core/Shipping/Services/Interfaces/IShippingQuoteService.cs` | Add `GetQuotesForWarehouseAsync()` method |
| `src/Merchello.Core/Shipping/Services/ShippingQuoteService.cs` | Implement `GetQuotesForWarehouseAsync()` |
| `src/Merchello.Core/Checkout/Strategies/DefaultOrderGroupingStrategy.cs` | Inject `IShippingQuoteService`. Add `PopulateShippingOptionsForGroupAsync()` that calls quote service for dynamic providers |

#### Phase A.4: Checkout & Order Flow
| File | Changes |
|------|---------|
| `src/Merchello.Core/Checkout/Strategies/Models/OrderGroupingContext.cs` | Change `SelectedShippingOptions` from `Dict<Guid, Guid>` to `Dict<Guid, string>`. Change `LineItemShippingSelections` to use SelectionKey |
| `src/Merchello.Core/Checkout/Services/Parameters/SaveShippingSelectionsParameters.cs` | Change `Selections` from `Dict<Guid, Guid>` to `Dict<Guid, string>` |
| `src/Merchello.Core/Checkout/Services/ShippingAutoSelector.cs` | Update all `Dict<Guid, Guid>` return types to `Dict<Guid, string>`. Update `SelectCheapest/Fastest` to return SelectionKey |
| `src/Merchello.Core/Checkout/Services/CheckoutService.cs` | Update selection save/load to handle string SelectionKey. Store `QuotedShippingCosts` when selection is saved |
| `src/Merchello/Controllers/CheckoutApiController.cs` | Map new DTO fields (`SelectionKey`, `ServiceCode`) to response |
| `src/Merchello.Core/Accounting/Services/InvoiceService.cs` | Parse SelectionKey in `CreateOrderFromBasketAsync`, store provider/service on Order |
| `src/Merchello.Core/Accounting/Dtos/AddProductToOrderDto.cs` | Add `ShippingSelectionKey` property for dynamic provider support in order editing |
| `src/Merchello.Core/Accounting/Dtos/AddCustomItemDto.cs` | Add `ShippingSelectionKey` property for dynamic provider support in order editing |

**NOTE: Backoffice Order Editing (edit-order-modal.element.ts)**

The backoffice `edit-order-modal.element.ts` already uses `shippingOptionId: string` in TypeScript. For dynamic providers, it will pass SelectionKey strings like `"dyn:fedex:FEDEX_GROUND"`. The C# DTOs need updating to parse these correctly (see [Order Editing DTOs](#order-editing-dtos-important) section).

#### Phase A.5: Frontend Updates
| File | Changes |
|------|---------|
| `src/Merchello/wwwroot/js/checkout/stores/checkout.store.js` | Update JSDoc typedefs to include `selectionKey` |
| `src/Merchello/wwwroot/js/checkout/components/checkout-shipping.js` | Change `option.id` → `option.selectionKey` in `selectOption()` and `getSelectedOption()` |

**NOTE: ShippingService Integration (VERIFIED)**

The `IShippingService.GetShippingOptionsForBasket()` method (called at `InvoiceService.cs:108`) internally calls `DefaultOrderGroupingStrategy.GroupItemsAsync()`. This means:
- **No separate changes needed to `ShippingService`** - updates to the strategy propagate automatically
- Both the checkout flow and direct `ShippingService` calls will benefit from the refactor

---

### Stage B: Dynamic Provider Improvement Files

These files are for the enhancement phase (after Stage A is complete).

#### Phase B.1: Capability Flag & Configuration (Stage B)
| File | Changes |
|------|---------|
| `src/Merchello.Core/Shipping/Providers/ProviderConfigCapabilities.cs` | Add `HasDynamicServices` property |
| **NEW** `src/Merchello.Core/Shipping/Models/WarehouseProviderConfig.cs` | New model for per-warehouse provider settings |
| **NEW** `src/Merchello.Core/Shipping/Mapping/WarehouseProviderConfigDbMapping.cs` | EF Core mapping |
| `src/Merchello.Core/Shipping/Providers/ShippingRateQuote.cs` | Add `Metadata`, `IsFallbackRate`, `FallbackReason` properties |
| `src/Merchello.Core/Products/Models/ProductRoot.cs` | Add `AllowExternalCarrierShipping` property |
| `src/Merchello.Core/Products/Mapping/ProductRootDbMapping.cs` | Map new column |
| `src/Merchello.Core/Accounting/Models/Order.cs` | Add `ShippingProviderKey`, `ShippingServiceCode`, `ShippingServiceName`, `QuotedShippingCost`, `QuotedAt` |
| `src/Merchello.Core/Accounting/Mapping/OrderDbMapping.cs` | Map new columns |

**Configuration Model Clarification:**
- `ShippingProviderConfiguration` (existing) = **Global** provider config (API keys, account numbers)
- `WarehouseProviderConfig` (new) = **Per-warehouse** provider settings (markup, exclusions)

### Provider Interface & Implementations (Phase 2)
| File | Changes |
|------|---------|
| `src/Merchello.Core/Shipping/Providers/Interfaces/IShippingProvider.cs` | Add `GetAvailableServicesAsync()`, `GetRatesForAllServicesAsync()` |
| `src/Merchello.Core/Shipping/Providers/ShippingProviderBase.cs` | Default implementations |
| `src/Merchello.Core/Shipping/Providers/FedEx/FedExShippingProvider.cs` | Implement Service Availability API, remove static list |
| `src/Merchello.Core/Shipping/Providers/FedEx/FedExApiClient.cs` | Add service availability endpoint |
| `src/Merchello.Core/Shipping/Providers/UPS/UpsShippingProvider.cs` | Implement dynamic services |
| `src/Merchello.Core/Shipping/Providers/UPS/UpsApiClient.cs` | Handle service discovery |
| `src/Merchello.Core/Shipping/Providers/BuiltIn/FlatRateShippingProvider.cs` | Ensure `HasDynamicServices = false` |

### Services (Phase 3)
| File | Changes |
|------|---------|
| `src/Merchello.Core/Shipping/Services/ShippingQuoteService.cs` | New flow for dynamic providers (see details below) |
| **NEW** `src/Merchello.Core/Shipping/Services/WarehouseProviderConfigService.cs` | CRUD for warehouse provider config |
| **NEW** `src/Merchello.Core/Shipping/Services/Interfaces/IWarehouseProviderConfigService.cs` | Interface (see below) |
| `src/Merchello.Core/Products/Extensions/ProductShippingExtensions.cs` | Add filter for ProductRoot's `AllowExternalCarrierShipping` |

**IWarehouseProviderConfigService Interface:**

```csharp
public interface IWarehouseProviderConfigService
{
    // Read operations
    Task<WarehouseProviderConfig?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<WarehouseProviderConfig?> GetByWarehouseAndProviderAsync(Guid warehouseId, string providerKey, CancellationToken ct = default);
    Task<IReadOnlyList<WarehouseProviderConfig>> GetByWarehouseAsync(Guid warehouseId, CancellationToken ct = default);
    Task<IReadOnlyList<WarehouseProviderConfig>> GetByProviderAsync(string providerKey, CancellationToken ct = default);
    Task<IReadOnlyList<WarehouseProviderConfig>> GetAllEnabledAsync(CancellationToken ct = default);

    // Write operations
    Task<WarehouseProviderConfig> CreateAsync(WarehouseProviderConfig config, CancellationToken ct = default);
    Task<WarehouseProviderConfig> UpdateAsync(WarehouseProviderConfig config, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);

    // Validation
    Task<bool> ExistsAsync(Guid warehouseId, string providerKey, CancellationToken ct = default);
}
```

**ShippingQuoteService Changes:**

1. **Add `GetQuotesForWarehouseAsync`** - New method for per-warehouse rate fetching
2. **Update `BuildCacheKey`** - Key by warehouse ID (rates vary by origin)
3. **Update `FetchQuotesFromProvidersAsync`** - Branch on `HasDynamicServices`
4. **Keep `GetQuotesAsync`** - For backward compat, internally calls per-warehouse method

**Relationship between GetQuotesAsync and GetQuotesForWarehouseAsync:**

```
GetQuotesAsync(basket, country, state)           ← Existing method (basket-level)
    │
    ├── Determine warehouse(s) for basket items
    │   └── Uses SelectWarehouseForProduct logic
    │
    └── For each warehouse:
            └── GetQuotesForWarehouseAsync(...)   ← New method (warehouse-level)
                    │
                    ├── For flat-rate providers: existing flow
                    └── For dynamic providers: new flow with WarehouseProviderConfig
```

The existing `GetQuotesAsync` is used for:
- `Basket.AvailableShippingQuotes` preview (before checkout)
- Simple single-warehouse scenarios

The new `GetQuotesForWarehouseAsync` is used for:
- `DefaultOrderGroupingStrategy` per-group rate fetching
- Multi-warehouse checkout where each group needs separate rates

**Important:** `GetQuotesAsync` should internally call `GetQuotesForWarehouseAsync` for each warehouse to ensure consistent behavior. This avoids duplicate rate-fetching logic.

**IShippingQuoteService interface addition:**
```csharp
Task<IReadOnlyCollection<ShippingRateQuote>> GetQuotesForWarehouseAsync(
    Guid warehouseId,
    Address warehouseAddress,
    IReadOnlyCollection<ShipmentPackage> packages,
    string destinationCountry,
    string? destinationState,
    string? destinationPostal,
    string currency,
    CancellationToken ct = default);
```

**FetchQuotesFromProvidersAsync Changes:**

```csharp
// Current logic (simplified):
if (provider.Metadata.ConfigCapabilities?.UsesLiveRates == true)
{
    // Extract service types from ShippingOptions
    var serviceTypes = providerOptions.Select(o => o.ServiceType).ToList();
    if (serviceTypes.Any())
        quote = await provider.GetRatesForServicesAsync(request, serviceTypes, providerOptions, ct);
}

// NEW logic:
if (provider.Metadata.ConfigCapabilities?.HasDynamicServices == true)
{
    // Get warehouse-level provider config (not ShippingOptions)
    var warehouseConfig = await _warehouseProviderConfigService
        .GetByWarehouseAndProviderAsync(warehouseId, providerKey, ct);

    if (warehouseConfig?.IsEnabled == true)
    {
        // Call new method - provider handles everything
        quote = await provider.GetRatesForAllServicesAsync(request, warehouseConfig, ct);
    }
}
else if (provider.Metadata.ConfigCapabilities?.UsesLiveRates == true)
{
    // Backward compat: existing flow for non-dynamic live-rate providers
    // (unlikely scenario but keeps code working during transition)
}
else
{
    // Flat-rate path (unchanged)
    quote = await provider.GetRatesAsync(request, ct);
}
```

### Checkout (Phase 4)
| File | Changes |
|------|---------|
| `src/Merchello.Core/Checkout/Services/CheckoutService.cs` | Handle SelectionKey format (string instead of Guid) when looking up selected options. Add backward-compatible parsing for old session format. |
| `src/Merchello.Core/Checkout/Models/CheckoutSession.cs` | Change `SelectedShippingOptions` from `Dict<Guid, Guid>` to `Dict<Guid, string>` |
| `src/Merchello.Core/Checkout/Strategies/Models/OrderGroup.cs` | Change `SelectedShippingOptionId` from `Guid?` to `string?` (SelectionKey) |
| `src/Merchello.Core/Checkout/Strategies/DefaultOrderGroupingStrategy.cs` | Update grouping logic to use SelectionKey matching |
| `src/Merchello.Core/Checkout/Dtos/ShippingGroupDto.cs` | Change `SelectedShippingOptionId` from `Guid?` to `string?` (SelectionKey) |
| `src/Merchello.Core/Checkout/Dtos/ShippingOptionDto.cs` | Add `SelectionKey`, `ServiceCode`, `EstimatedDeliveryDate` properties. **Note: This is the CHECKOUT DTO, separate from `Shipping/Dtos/ShippingOptionDto.cs` which is for backoffice admin.** |
| `src/Merchello.Core/Accounting/Services/InvoiceService.cs` | Parse SelectionKey to determine if flat-rate or dynamic; store provider/service on order |
| `src/Merchello/Controllers/CheckoutApiController.cs` | Ensure `GetDisplayShippingOptionCost()` is called for all options (already done) |

**Note: Two Separate ShippingOptionDto Classes**

There are TWO different `ShippingOptionDto` classes that serve different purposes:

| File | Purpose | Fields |
|------|---------|--------|
| `Checkout/Dtos/ShippingOptionDto.cs` | Customer-facing checkout UI | Minimal: Id, Name, Cost, FormattedCost, DaysFrom, DaysTo, IsNextDay, ProviderKey + NEW SelectionKey, ServiceCode |
| `Shipping/Dtos/ShippingOptionDto.cs` | Backoffice admin shipping management | Detailed: Id, Name, WarehouseId, WarehouseName, ProviderKey, ServiceType, IsEnabled, FixedCost, UsesLiveRates, etc. |

These CANNOT be merged - they serve fundamentally different UI needs. Only the Checkout version needs SelectionKey for the customer flow.

### API Controllers
| File | Changes |
|------|---------|
| `src/Merchello/Controllers/ShippingProvidersApiController.cs` | Warehouse config endpoints |
| **NEW** DTOs for warehouse provider config |

### Database
| Change |
|--------|
| New table: `merchelloWarehouseProviderConfigs` |
| New column: `merchelloProductRoots.AllowExternalCarrierShipping` (bool, default true) |
| New columns: `merchelloOrders.ShippingProviderKey`, `.ShippingServiceCode`, `.ShippingServiceName`, `.QuotedShippingCost`, `.QuotedAt` |
| Existing ShippingOptions for external providers become obsolete (can be cleaned up) |

### Currency Conversion (PRESERVE EXISTING BEHAVIOR)

**Critical:** External providers MUST continue to convert rates to the request currency.

The existing architecture document specifies:
> "External carrier APIs (FedEx, UPS, DHL) return rates in the carrier account's currency. All external providers MUST convert rates to `request.CurrencyCode` (basket currency)."

This requirement remains unchanged. The `GetRatesForAllServicesAsync` implementation must:
1. Fetch rates from carrier API (in carrier's account currency)
2. Convert to `request.CurrencyCode` using `IExchangeRateCache`
3. Apply currency-aware rounding via `ICurrencyService`
4. If no exchange rate available, return error (don't show wrong currency)

**Current FedEx Implementation (Already Working):**
```csharp
// FedExShippingProvider.cs lines 358-364
var requestCurrency = request.CurrencyCode ?? _settings.StoreCurrencyCode;
if (!string.Equals(fedexCurrency, requestCurrency, StringComparison.OrdinalIgnoreCase))
{
    fedexToRequestRate = await _exchangeRateCache.GetRateAsync(fedexCurrency, requestCurrency, cancellationToken);
    if (!fedexToRequestRate.HasValue || fedexToRequestRate.Value <= 0m)
    {
        errors.Add($"No exchange rate available to convert FedEx rates from {fedexCurrency} to {requestCurrency}.");
        // ... handle error
    }
}
```

### Multi-Currency Checkout Integration

When customer switches currency in checkout:

1. **Basket recalculation** triggers `CalculateBasketAsync()` with new currency
2. **ShippingQuoteRequest.CurrencyCode** is set to basket currency
3. **External providers** convert carrier rates → request currency via `IExchangeRateCache`
4. **Order grouping** must pass the currency through to ShippingQuoteService

**Required Change in DefaultOrderGroupingStrategy:**
```csharp
// OrderGroupingContext needs currency (already exists via Basket.Currency)
var quotes = await shippingQuoteService.GetQuotesForWarehouseAsync(
    group.WarehouseId,
    warehouseAddress,
    packages,
    destinationCountry,
    destinationState,
    null,
    context.Basket.Currency,  // <-- Pass currency from basket
    ct);
```

### Tax-Inclusive Display (CRITICAL)

**The refactor MUST integrate with existing tax-inclusive pricing.**

**Current Implementation (DisplayCurrencyExtensions.cs lines 275-292):**
```csharp
public static decimal GetDisplayShippingOptionCost(
    decimal cost,
    StorefrontDisplayContext displayContext,
    ICurrencyService currencyService)
{
    var rate = displayContext.ExchangeRate;
    var currency = displayContext.CurrencyCode;

    if (displayContext.DisplayPricesIncTax &&
        displayContext.IsShippingTaxable &&
        displayContext.ShippingTaxRate.HasValue)
    {
        var shippingTaxRate = displayContext.ShippingTaxRate.Value;
        return currencyService.Round(cost * (1 + (shippingTaxRate / 100m)) * rate, currency);
    }

    return currencyService.Round(cost * rate, currency);
}
```

**This already works** for any `ShippingOptionInfo.Cost` value. The refactor's new dynamic options will automatically get tax-inclusive display because:

1. `ShippingOptionInfo.Cost` is the NET shipping cost (from provider)
2. `CheckoutApiController` calls `GetDisplayShippingOptionCost()` on each option
3. Tax is applied if `DisplayPricesIncTax` setting is enabled

**Key Points:**
- Dynamic provider rates are returned in basket currency (already converted by provider)
- Tax is applied at DISPLAY time, not at quote time
- `StorefrontDisplayContext.ShippingTaxRate` comes from `TaxProviderManager.GetShippingTaxRateForLocationAsync()`
- No changes needed to tax handling - it works automatically

**Verification Checklist:**
- [ ] Dynamic provider rates pass through `GetDisplayShippingOptionCost()` in controller
- [ ] `ShippingOptionInfo.Cost` contains NET cost (not tax-inclusive)
- [ ] Frontend receives tax-inclusive cost when setting is enabled

### Admin UI (Phase 5)
| Component | Changes |
|-----------|---------|
| Provider setup modal | Add warehouse config section (enable, markup, exclusions) |
| Shipping method creation | Show flat-rate UI only for flat-rate provider |
| ProductRoot shipping tab | Add "Allow external carrier shipping" checkbox (checked by default) |

---

## Verification & Testing

### Unit Tests
1. `WarehouseProviderConfigService` - CRUD operations
2. `ShippingQuoteService` - Dynamic provider flow with mock API responses
3. `ProductShippingExtensions` - `AllowExternalCarrierShipping` filtering
4. FedEx/UPS providers - Service discovery with mocked API

### Integration Tests
1. **Quote flow**: Basket with mixed products (some allow dynamic, some don't)
2. **Checkout flow**: Select dynamic provider service, complete order
3. **Order storage**: Verify `ShippingProviderKey`, `ShippingServiceCode` persisted
4. **API fallback**: Simulate carrier API down, verify cached rates returned

### Manual Testing Checklist
- [ ] Enable FedEx provider globally with API credentials
- [ ] Configure warehouse: enable FedEx, set 10% markup, exclude overnight services
- [ ] Create product with `AllowExternalCarrierShipping = true` (default, checkbox checked)
- [ ] Create product with `AllowExternalCarrierShipping = false` (checkbox unchecked, flat-rate only)
- [ ] Add both products to basket
- [ ] Go to checkout with different destination addresses
- [ ] Verify: External-enabled product shows FedEx rates + flat rates
- [ ] Verify: External-disabled product shows flat rates only
- [ ] Verify: Excluded services (overnight) don't appear
- [ ] Verify: Markup applied correctly (10% on FedEx rates)
- [ ] Verify: Estimated delivery dates displayed for carrier services
- [ ] Select shipping, complete order
- [ ] Verify order has `ShippingProviderKey`, `ShippingServiceCode`, `ShippingServiceName`
- [ ] Test with carrier API unavailable → cached rates shown

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| FedEx/UPS API rate limits | Implement caching, batch requests where possible |
| API response format changes | Use defensive parsing, log unexpected fields |
| Service codes change | Store display name alongside code for historical orders |
| Performance (extra API calls) | Cache aggressively, async parallel provider calls |
| Backwards compatibility | N/A - MVP with clean database |

---

## Out of Scope (Future Considerations)
- Per-product, per-provider service exclusions (e.g., "no FedEx Ground for fragile items") - use warehouse-level exclusions as workaround
- Multiple configurations per provider (e.g., different FedEx accounts per warehouse)
- Customer-selectable delivery dates - carriers don't support this via API; customers choose service level which determines estimated delivery date (FedEx/UPS My Choice handles post-purchase date changes)

## Included in MVP
- **Estimated delivery dates**: Displayed from carrier API response (already on `ShippingServiceLevel.EstimatedDeliveryDate`)
- **Saturday delivery**: Returned as a separate service option with its own rate when available
- **Service-specific options**: Pass through whatever the carrier API returns (surcharges, special services)

---

## Phase Dependencies

The implementation is split into two stages with specific dependencies:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│           STAGE A: CRITICAL PATH (Makes External Providers Work)            │
│                                                                             │
│   A.1              A.2              A.3              A.4              A.5   │
│ ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐ │
│ │Selection │───►│ Model    │───►│ Quote    │───►│ Checkout │───►│Frontend│ │
│ │Key Ext.  │    │ Updates  │    │ Service  │    │ & Order  │    │Updates │ │
│ └──────────┘    └──────────┘    └──────────┘    └──────────┘    └────────┘ │
│                                       │               │                     │
│                                       │               ▼                     │
│                                       │        ┌─────────────┐              │
│                                       └───────►│ Invoice     │              │
│                                                │ Service     │              │
│                                                └─────────────┘              │
│                                                                             │
│   After Stage A: External provider rates appear in checkout (not $0)        │
│   Providers still use hardcoded service types from existing ShippingOptions │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│        STAGE B: DYNAMIC IMPROVEMENTS (Enhancement - Optional Next)          │
│                                                                             │
│   B.1              B.2              B.3/B.4          B.5              B.6   │
│ ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐ │
│ │Capability│───►│ Provider │───►│ FedEx &  │───►│ Quote    │───►│Product │ │
│ │Flag &    │    │ Interface│    │ UPS      │    │ Service  │    │Restrict│ │
│ │Warehouse │    │ Updates  │    │ Dynamic  │    │ Refactor │    │& Admin │ │
│ │Config    │    │          │    │          │    │          │    │ UI     │ │
│ └──────────┘    └──────────┘    └──────────┘    └──────────┘    └────────┘ │
│                                                                             │
│   After Stage B: Providers return services from carrier APIs dynamically    │
│   No more hardcoded service types - rates based on origin/destination       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Insight:**
- **Stage A** makes external providers work by connecting `ShippingQuoteService` → `OrderGroup.AvailableShippingOptions`
- **Stage B** removes hardcoded service types and makes rates truly dynamic based on carrier API responses
- Stage A MUST be completed before Stage B
- Stage B can be implemented incrementally (FedEx first, then UPS)

---

## Rollback Strategy

**Rollback is straightforward due to the feature flag approach (see below).**

If issues arise after deployment:

| Scenario | Rollback Action |
|----------|-----------------|
| **Critical Path issues** | Revert `DefaultOrderGroupingStrategy` to use `ShippingCostResolver` directly (existing code path) |
| **Dynamic provider issues** | Set `HasDynamicServices = false` on affected providers - they revert to `ShippingOption`-based flow |
| **FedEx API failures** | Automatic fallback to static service list (built-in) |
| **Performance issues** | Reduce cache TTL, disable problematic providers at warehouse level |

**Database Rollback:**
Since this is MVP with a clean database, no data migration is needed. However, if orders exist with `ShippingOptionId = Guid.Empty` (dynamic provider orders), they will still display correctly using `ShippingServiceName`.

---

## Metrics and Observability

### Required Metrics

| Metric | Labels | Purpose |
|--------|--------|---------|
| `merchello_shipping_quote_requests_total` | `provider`, `status` (success/error/fallback) | Track API reliability |
| `merchello_shipping_quote_latency_ms` | `provider` | Monitor API performance |
| `merchello_shipping_cache_hit_ratio` | `cache_type` (quotes/availability) | Cache effectiveness |
| `merchello_shipping_fallback_rate` | `provider`, `reason` | Track when fallbacks are used |

### Required Logging

```csharp
// Structured logging with correlation ID
_logger.LogInformation(
    "Shipping quote requested. Provider={Provider} Warehouse={WarehouseId} Destination={DestCountry} " +
    "ServicesReturned={ServiceCount} IsFallback={IsFallback} CorrelationId={CorrelationId}",
    providerKey, warehouseId, destCountry, serviceCount, isFallback, correlationId);

_logger.LogWarning(
    "Shipping provider API failed. Provider={Provider} Error={ErrorMessage} " +
    "UsingFallback={UsingFallback} CorrelationId={CorrelationId}",
    providerKey, ex.Message, true, correlationId);
```

### Alerting Rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| **API Sustained Failure** | >3 failures in 5 minutes for same provider | Warning |
| **High Fallback Rate** | >20% fallback rate over 1 hour | Warning |
| **Zero Quotes Returned** | Any request returns 0 shipping options | Error |
| **High Latency** | p95 > 5s for any provider | Warning |

---

## Feature Flag Approach

**Recommendation:** Use a configuration flag to enable/disable dynamic provider behavior without code deployment.

```json
// appsettings.json
{
  "Merchello": {
    "Shipping": {
      "UseDynamicExternalProviders": true,  // Master switch
      "DynamicProviders": {
        "fedex": true,   // Per-provider override
        "ups": true
      }
    }
  }
}
```

**Implementation:**

```csharp
// In ShippingQuoteService.FetchQuotesFromProvidersAsync
var useDynamic = _settings.Shipping?.UseDynamicExternalProviders ?? false;
var providerEnabled = _settings.Shipping?.DynamicProviders?.GetValueOrDefault(providerKey, false) ?? false;

if (useDynamic && providerEnabled && provider.Metadata.ConfigCapabilities?.HasDynamicServices == true)
{
    // Use dynamic provider flow
    var warehouseConfig = await _warehouseProviderConfigService
        .GetByWarehouseAndProviderAsync(warehouseId, providerKey, ct);
    quote = await provider.GetRatesForAllServicesAsync(request, warehouseConfig, ct);
}
else
{
    // Use existing ShippingOption-based flow (backward compatible)
    var serviceTypes = providerOptions.Select(o => o.ServiceType!).ToList();
    quote = await provider.GetRatesForServicesAsync(request, serviceTypes, providerOptions, ct);
}
```

**Benefits:**
- Toggle per-provider without redeployment
- Gradual rollout (enable FedEx first, then UPS)
- Easy rollback if issues arise
- A/B testing possible

---

## Implementation Summary

### Key Architectural Changes

1. **New capability flag**: `HasDynamicServices` distinguishes dynamic vs manual providers
2. **New configuration layer**: `WarehouseProviderConfig` for per-warehouse provider settings
3. **New interface methods**: `GetAvailableServicesAsync()` and `GetRatesForAllServicesAsync()`
4. **Product-level toggle**: `ProductRoot.AllowExternalCarrierShipping`
5. **Order storage**: Direct provider/service fields instead of ShippingOption lookup

### What Stays the Same

- **Flat-rate provider**: Unchanged - uses ShippingOptions with costs/weight tiers
- **ShippingOption model**: Kept for flat-rate, ignored for dynamic providers
- **Currency conversion**: Required for all external providers
- **Rate caching**: Same CacheService pattern with 10-min TTL
- **Product restrictions**: AllowedShippingOptions/ExcludedShippingOptions still work for flat-rate

### Critical Implementation Notes

1. **Don't break flat-rate**: All changes must preserve existing flat-rate behavior
2. **Currency first**: Never return rates in wrong currency - error instead
3. **Fallback gracefully**: Users should always see some shipping options
4. **Log everything**: API failures need correlation IDs for debugging
5. **Cache service availability**: Use `{originCountry}:{originPostal}:{destCountry}` key format (postal-level for accuracy, limited to warehouse addresses)

### Recommended Implementation Order

**CRITICAL PATH (must be done first to make external providers work at all):**
1. Add `GetQuotesForWarehouseAsync()` to `IShippingQuoteService` and implement
2. Update `ShippingOptionInfo` with `ServiceCode`, `EstimatedDeliveryDate`, `SelectionKey`
3. Modify `DefaultOrderGroupingStrategy` to call `ShippingQuoteService` for dynamic providers
4. Update selection storage format (`Guid` → `string` SelectionKey)
5. Update `CheckoutService` and `InvoiceService` to handle SelectionKey format

**THEN proceed with dynamic provider improvements:**
6. Add `HasDynamicServices` flag and `WarehouseProviderConfig` model
7. Add `GetAvailableServicesAsync()` interface method with default implementations
8. Implement FedEx Service Availability API integration
9. Implement UPS dynamic flow (request-all-filter-errors approach)
10. Add UI for warehouse provider configuration
11. Remove/deprecate external provider ShippingOptions (ProviderKey != "flat-rate")

---

## Architecture Alignment

This refactor adheres to the Merchello architecture principles defined in [Architecture-Diagrams.md](./Architecture-Diagrams.md):

### Single Source of Truth

| Principle | Implementation |
|-----------|----------------|
| **All business logic in services** | `ShippingQuoteService.GetQuotesForWarehouseAsync()` is the single entry point for rate fetching - no duplicate logic in controllers or strategies |
| **Services own DB access** | `WarehouseProviderConfigService` handles all CRUD for warehouse provider config - controllers never access DbContext directly |
| **Factories for object creation** | No changes to factory pattern - existing factories remain responsible for creating domain objects |
| **Centralized calculations** | Rate calculations, markup application, currency conversion all happen in `ShippingQuoteService` or provider implementations - never duplicated |

### Service Layer Pattern

```
CONTROLLERS → Thin: HTTP only, validates input, returns DTOs
     ↓
SERVICES    → ShippingQuoteService: rate fetching, caching, provider orchestration
             WarehouseProviderConfigService: CRUD for warehouse settings
             CheckoutService: session management, selection storage
     ↓
PROVIDERS   → IShippingProvider implementations: carrier API integration
```

**Key architectural decisions:**

1. **`DefaultOrderGroupingStrategy` calls `ShippingQuoteService`** - not carrier APIs directly. This maintains the service abstraction layer.

2. **`WarehouseProviderConfig` is a domain model** - stored via service, not managed by providers. Providers receive config as a parameter.

3. **Controllers remain thin** - `ShippingProvidersApiController` adds endpoints that delegate to services, never containing business logic.

4. **Provider discovery via `ExtensionManager`** - unchanged, maintains pluggable provider pattern.

### RORO Pattern Compliance

New service methods follow Request/Response as Objects pattern:

```csharp
// Parameters grouped into request objects
Task<IReadOnlyCollection<ShippingRateQuote>> GetQuotesForWarehouseAsync(
    Guid warehouseId,
    Address warehouseAddress,           // Existing Address model
    IReadOnlyCollection<ShipmentPackage> packages,  // Existing model
    string destinationCountry,
    string? destinationState,
    string? destinationPostal,
    string currency,
    CancellationToken ct = default);

// Returns domain objects, not primitives
Task<ShippingRateQuote?> GetRatesForAllServicesAsync(
    ShippingQuoteRequest request,       // Existing request model
    WarehouseProviderConfig warehouseConfig,  // New config model
    CancellationToken cancellationToken = default);
```

---

## Frontend Checkout Integration (Alpine.js)

The single-page checkout ([single-page-checkout.js](../src/Merchello/wwwroot/js/checkout/components/single-page-checkout.js)) requires updates to handle the new `SelectionKey` format.

### Current Frontend State

**NOTE:** The backend `ShippingOptionDto.Id` (Guid) serializes to lowercase `id` in JSON. The frontend uses `option.id`, not `option.shippingOptionId`.

```javascript
// Current: shippingSelections is Dict<groupId: string, optionId: string>
// (Values are Guid strings like "a1b2c3d4-...")
get shippingSelections() { return this.$store.checkout?.shippingSelections ?? {}; }

// Current checkout-shipping.js (line 102):
this.$store.checkout?.setShippingSelection(groupId, option.id);

// Current checkout.store.js typedef (lines 53-62):
// @typedef {Object} ShippingOption
// @property {string} id
// @property {string} name
// @property {number} cost
// ...
```

### Required Frontend Changes

**1. SelectionKey format change:**

```javascript
// NEW: shippingSelections is Dict<groupId: string, selectionKey: string>
// Where selectionKey uses prefixed format:
//   - "so:{guid}" for flat-rate ShippingOption (e.g., "so:a1b2c3d4-...")
//   - "dyn:{provider}:{serviceCode}" for dynamic (e.g., "dyn:fedex:FEDEX_GROUND")

// checkout-shipping.js update (line 102):
this.$store.checkout?.setShippingSelection(groupId, option.selectionKey);  // NEW: Use selectionKey instead of option.id

// checkout.store.js setShippingSelection update:
setShippingSelection(groupId, selectionKey) {  // Parameter renamed from optionId
  // ...
}
```

**2. ShippingOptionInfo DTO changes:**

```typescript
// Current ShippingOptionDto (Checkout/Dtos/ShippingOptionDto.cs → JSON)
interface ShippingOptionDto {
  id: string;          // Guid (JSON lowercase from C# Id property)
  name: string;
  cost: number;
  formattedCost: string;
  daysFrom: number;
  daysTo: number;
  isNextDay: boolean;
  deliveryDescription: string;
  providerKey: string;
}

// NEW ShippingOptionDto
interface ShippingOptionDto {
  id: string;                     // Guid.Empty for dynamic providers
  name: string;
  cost: number;
  formattedCost: string;
  daysFrom: number;
  daysTo: number;
  isNextDay: boolean;
  deliveryDescription: string;
  providerKey: string;
  serviceCode?: string;           // NEW: "FEDEX_GROUND" for dynamic
  estimatedDeliveryDate?: string; // NEW: ISO date from carrier
  selectionKey: string;           // NEW: Unified selection identifier ("so:{guid}" or "dyn:{provider}:{service}")
  isFallbackRate?: boolean;       // NEW: true if rate is from cache due to API failure
  fallbackReason?: string;        // NEW: "carrier_api_unavailable", "rate_limit_exceeded", etc.
}
```

**3. API endpoint contract changes:**

| Endpoint | Change |
|----------|--------|
| `POST /api/merchello/checkout/shipping` | Request body: `{ selections: Dict<groupId, selectionKey> }` instead of `Dict<groupId, shippingOptionId>` |
| `GET /api/merchello/checkout/shipping-groups` | Response: `ShippingOptionDto` includes new fields |

**4. Files requiring frontend changes:**

| File | Changes |
|------|---------|
| `src/Merchello/wwwroot/js/checkout/stores/checkout.store.js` | **CRITICAL**: Central Alpine.js store. Update `shippingSelections` type in JSDoc. Update `setShippingSelection(groupId, optionId)` method to accept SelectionKey string. Update `ShippingOption` typedef to include `selectionKey`. |
| `src/Merchello/wwwroot/js/checkout/components/single-page-checkout.js` | Update radio button value binding from `option.id` to `option.selectionKey`, update selection storage |
| `src/Merchello/wwwroot/js/checkout/components/checkout-shipping.js` | Update `selectOption()` to use `option.selectionKey` instead of `option.id`. Update `getSelectedOption()` lookup. |
| `src/Merchello/wwwroot/js/checkout/services/api.js` | Update `saveShipping()` payload format (already accepts string values) |
| `src/Merchello/Client/src/shipping/` | Backoffice shipping config UI for warehouse provider config |

**5. Backward compatibility consideration:**

The frontend should handle both formats during transition:

```javascript
// Helper to get selection key from option
getSelectionKey(option) {
  // New format available
  if (option.selectionKey) return option.selectionKey;
  // Fallback for old format (convert Guid to so: prefixed format)
  return option.id ? `so:${option.id}` : option.id;
}
```

### Checkout Flow Diagram (Updated)

```
User enters shipping address
        ↓
Frontend calls: POST /api/merchello/checkout/initialize
        ↓
Backend: CheckoutService.InitializeAsync()
        ↓
Backend: DefaultOrderGroupingStrategy.GroupItemsAsync()
        ↓                                           ↓
    Flat-rate products               Dynamic provider products
        ↓                                           ↓
    ShippingCostResolver              ShippingQuoteService.GetQuotesForWarehouseAsync()
        ↓                                           ↓
    ShippingOptionDto {               ShippingOptionDto {
      id: "a1b2c3d4-...",               id: "00000000-0000-0000-0000-000000000000",
      selectionKey: "so:a1b2...",       serviceCode: "FEDEX_GROUND",
      cost: 5.99,                       selectionKey: "dyn:fedex:FEDEX_GROUND",
      ...                               estimatedDeliveryDate: "2025-01-25",
    }                                   cost: 15.99,
                                        ...
                                      }
        ↓
Frontend displays shipping options with radio buttons
  <input :value="option.selectionKey" x-model="...">
        ↓
User selects option, Frontend calls: POST /api/merchello/checkout/shipping
  Body: { selections: { "group-guid": "dyn:fedex:FEDEX_GROUND" } }
        ↓
Backend: CheckoutService.SaveShippingSelectionsAsync()
  Stores selectionKey in CheckoutSession
        ↓
User completes checkout
        ↓
Backend: InvoiceService.CreateOrderFromBasketAsync()
  Parses selectionKey using SelectionKeyExtensions.TryParse():
    - If "so:" prefix: lookup ShippingOption, store ShippingOptionId on Order
    - If "dyn:" prefix: store ShippingProviderKey, ShippingServiceCode on Order
```

### Checkout Loading State UX (CRITICAL)

**Problem:** Dynamic providers require API calls to carriers (FedEx, UPS) which can take 1-5+ seconds. The checkout UI must not hang or appear broken during this time.

**Existing Infrastructure (Already Implemented):**

The checkout store and component already have loading state plumbing:

```javascript
// checkout.store.js (lines 214-218)
shippingLoading: false,
shippingError: null,

// Methods available:
setShippingLoading(loading)   // line 488
setShippingError(error)       // line 496

// checkout-shipping.js (lines 49-56)
get loading() {
    return this.$store.checkout?.shippingLoading ?? false;
}
get error() {
    return this.$store.checkout?.shippingError ?? null;
}
```

**When Loading States Must Be Triggered:**

| Trigger | Action | Expected Duration |
|---------|--------|-------------------|
| Address country/postal changes | `setShippingLoading(true)` → Fetch rates → `setShippingLoading(false)` | 1-5s (API call) |
| Initial checkout load (no cached rates) | `setShippingLoading(true)` on mount | 1-5s |
| Currency change | `setShippingLoading(true)` → Re-fetch rates in new currency | 1-3s |
| Basket contents change | `setShippingLoading(true)` → Re-calculate groups | 1-5s |

**Required UI States:**

**1. Loading State (shippingLoading = true):**

```html
<!-- Shipping section during loading -->
<div x-show="loading" class="shipping-loading">
    <div class="skeleton-loader">
        <div class="skeleton-line skeleton-option"></div>
        <div class="skeleton-line skeleton-option"></div>
        <div class="skeleton-line skeleton-option"></div>
    </div>
    <p class="loading-message">Calculating shipping rates...</p>
</div>
```

CSS skeleton loader styles:
```css
.skeleton-option {
    height: 60px;
    margin-bottom: 12px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
```

**2. Error State (shippingError != null):**

```html
<div x-show="error" class="shipping-error">
    <div class="error-icon">⚠️</div>
    <p class="error-message" x-text="error"></p>
    <button @click="retryShipping()" class="retry-button">
        Try Again
    </button>
</div>
```

**3. Fallback Rate State (rates from cache due to API failure):**

The `ShippingRateQuote` model includes `IsFallbackRate` and `FallbackReason` (see line 760-762). When displaying fallback rates:

```html
<template x-if="option.isFallbackRate">
    <div class="fallback-notice">
        <span class="info-icon">ℹ️</span>
        Estimated rate - final cost confirmed at payment
    </div>
</template>
```

**4. Timeout Handling:**

Backend timeout is 5 seconds per carrier API call. Frontend should:
- Show loading state immediately
- After 8 seconds total, show "Taking longer than expected..." message
- After 15 seconds, show error with retry option

```javascript
// In shipping orchestrator
async fetchShippingRates() {
    this.$store.checkout.setShippingLoading(true);
    this.$store.checkout.setShippingError(null);

    const timeoutId = setTimeout(() => {
        // Update UI to show "taking longer" message
        this.showSlowMessage = true;
    }, 8000);

    try {
        const response = await api.getShippingGroups();
        clearTimeout(timeoutId);
        this.$store.checkout.updateShipping(response.groups);
    } catch (error) {
        clearTimeout(timeoutId);
        this.$store.checkout.setShippingError(
            'Unable to calculate shipping. Please check your address and try again.'
        );
    } finally {
        this.$store.checkout.setShippingLoading(false);
        this.showSlowMessage = false;
    }
}
```

**5. Partial Results (Multi-Warehouse):**

When fetching rates for multiple warehouses, one may succeed while another fails. The API should return partial results with per-group error indicators:

```typescript
interface ShippingGroupDto {
    groupId: string;
    groupName: string;
    shippingOptions: ShippingOptionDto[];
    // NEW: Per-group error state
    rateError?: string;           // "Unable to fetch FedEx rates"
    hasFallbackRates?: boolean;   // true if using cached rates
}
```

UI for partial failures:
```html
<template x-for="group in groups">
    <div class="shipping-group">
        <h4 x-text="group.groupName"></h4>

        <!-- Show warning if this group has fallback rates -->
        <div x-show="group.hasFallbackRates" class="fallback-warning">
            ⚠️ Using estimated rates - carrier unavailable
        </div>

        <!-- Show error if no rates available for this group -->
        <div x-show="group.rateError" class="group-error">
            <span x-text="group.rateError"></span>
            <button @click="retryGroup(group.groupId)">Retry</button>
        </div>

        <!-- Normal shipping options -->
        <template x-for="option in group.shippingOptions">
            <!-- ... -->
        </template>
    </div>
</template>
```

**Implementation Checklist for Loading UX:**

| Task | File | Priority |
|------|------|----------|
| Add skeleton loader HTML to shipping component | `checkout-shipping.js` or Razor partial | High |
| Add skeleton CSS styles | `checkout.css` | High |
| Wrap API calls with loading state management | `single-page-checkout.js` orchestrator | High |
| Add timeout handling (8s warning, 15s error) | Orchestrator | Medium |
| Add `isFallbackRate` to `ShippingOptionDto` | `ShippingOptionDto.cs` | Medium |
| Add `rateError`, `hasFallbackRates` to `ShippingGroupDto` | `ShippingGroupDto.cs` | Medium |
| Add retry button functionality | Orchestrator | Medium |
| Add "Taking longer than expected" message | Razor partial | Low |
| Add per-group error display | `checkout-shipping.js` | Low |

**Accessibility Requirements:**

- Loading state must be announced to screen readers (use existing `announcer.announce()`)
- Error messages must be focusable and announced
- Skeleton loaders should have `aria-hidden="true"` with a live region for the loading message

```javascript
// In setShippingLoading method (checkout.store.js)
setShippingLoading(loading) {
    this.shippingLoading = loading;
    if (loading) {
        announcer.announce('Calculating shipping rates, please wait');
    }
}
```

---

## Documentation Updates Required

**IMPORTANT:** After this refactor is implemented, the following documentation files MUST be updated:

### 1. Architecture-Diagrams.md

| Section | Updates Needed |
|---------|----------------|
| **4.2 Shipping Providers** | Add `HasDynamicServices` capability, document `GetAvailableServicesAsync()` and `GetRatesForAllServicesAsync()` methods |
| **2.5 Shipping & Fulfillment** | Add `IWarehouseProviderConfigService` to service list |
| **6. Entity Relationships** | Add `WarehouseProviderConfig` → Warehouse relationship |

### 2. ShippingProviders-Architecture.md

| Section | Updates Needed |
|---------|----------------|
| **Provider Capabilities** | Add `HasDynamicServices` capability documentation |
| **Provider Configuration Capabilities** | Update `ProviderConfigCapabilities` record |
| **ShippingOption-Provider Linkage** | Document that external providers no longer use ShippingOptions |
| **Quote Flow** | Update diagram to show dynamic vs static provider paths |
| **Database Schema** | Add `merchelloWarehouseProviderConfigs` table |
| **File Structure** | Add new files (`WarehouseProviderConfig.cs`, `WarehouseProviderConfigService.cs`) |
| **API Endpoints** | Add warehouse provider config endpoints |

### 3. ShippingProviders-DevGuide.md

| Section | Updates Needed |
|---------|----------------|
| **Provider Capabilities** | Add `HasDynamicServices` to capabilities table |
| **Configuration Capabilities** | Update table with dynamic provider row |
| **Service Types Model** | Document that dynamic providers return service types from API, not static list |
| **GetRatesForServicesAsync** | Document new `GetRatesForAllServicesAsync()` method |
| **Example 1: FedEx** | Update to show Service Availability API usage, remove static `SupportedServiceTypes` |
| **Example 2: UPS** | Update to show request-all-filter-errors approach |
| **NEW Section: Dynamic Provider Development** | Add new section for building providers with `HasDynamicServices = true` |
| **Testing Provider Configuration** | Update to reflect warehouse-level config vs per-service ShippingOptions |

### 4. New Documentation Required

| File | Content |
|------|---------|
| `docs/ShippingProviders-Migration.md` | Guide for migrating existing external provider ShippingOptions to WarehouseProviderConfig (if needed for non-MVP scenarios) |

---

## Testing Requirements

### Existing Tests to Update

| Test File | Changes Required |
|-----------|------------------|
| `src/Merchello.Tests/Shipping/ShippingQuoteServiceTests.cs` | Add tests for `GetQuotesForWarehouseAsync()`, mock dynamic provider responses |
| `src/Merchello.Tests/Checkout/DefaultOrderGroupingStrategyTests.cs` | Update to verify dynamic provider integration, test `SelectionKey` format |
| `src/Merchello.Tests/Checkout/CheckoutServiceTests.cs` | Update selection storage tests for string format |
| `src/Merchello.Tests/Accounting/InvoiceServiceTests.cs` | Add tests for parsing `SelectionKey` and storing provider/service fields |

### New Unit Tests Required

| Test Class | Test Cases |
|------------|------------|
| `WarehouseProviderConfigServiceTests.cs` | CRUD operations, validation, JSON deserialization for exclusions/markups |
| `ShippingQuoteService_DynamicProviderTests.cs` | Dynamic provider detection, `GetRatesForAllServicesAsync()` calls, markup application, exclusion filtering |
| `FedExShippingProvider_DynamicTests.cs` | Service Availability API mocking, fallback behavior, all-services rate fetching |
| `UpsShippingProvider_DynamicTests.cs` | Request-all-filter approach, error handling, service code mapping |
| `ShippingOptionInfoTests.cs` | `SelectionKey` generation for both flat-rate and dynamic providers |
| `ProductShippingExtensions_DynamicTests.cs` | `AllowExternalCarrierShipping` filtering logic |

### New Integration Tests Required

| Test | Description |
|------|-------------|
| `DynamicShippingQuoteIntegrationTests.cs` | End-to-end: basket → dynamic provider rates → checkout selection → order creation |
| `MixedProviderCheckoutTests.cs` | Basket with products using flat-rate AND dynamic providers |
| `MultiWarehouseDynamicShippingTests.cs` | Two warehouses with different provider configs, verify separate rate fetching |
| `WarehouseProviderConfigApiTests.cs` | Controller endpoints for warehouse config CRUD |
| `SelectionKeyParsingTests.cs` | Verify `CheckoutService` and `InvoiceService` correctly parse both Guid and `provider:service` formats |
| `CurrencyConversionDynamicTests.cs` | Dynamic provider rates convert to basket currency correctly |
| `TaxInclusiveDynamicShippingTests.cs` | Dynamic rates display correctly with tax-inclusive pricing enabled |
| `FallbackRateTests.cs` | API unavailable → cached rates returned with `IsFallbackRate` flag |
| `QuotedRatePreservationTests.cs` | Selected rate is preserved through checkout even if cache expires |

### API Contract Tests

| Test | Validates |
|------|-----------|
| `CheckoutApiContractTests.cs` | `ShippingOptionDto` includes all new fields (`selectionKey`, `serviceCode`, `estimatedDeliveryDate`) |
| `ShippingGroupsApiTests.cs` | Response format matches frontend expectations |
| `SaveShippingApiTests.cs` | Accepts both Guid and `provider:service` selection formats |

### Performance Tests

| Test | Validates |
|------|-----------|
| `DynamicProviderCacheTests.cs` | Rate caching works per warehouse, cache keys are correct |
| `ConcurrentQuoteRequestTests.cs` | Multiple simultaneous quote requests don't cause race conditions |

---

## Additional Considerations (Post-Review)

### ShippingService Integration Clarification

**Verified:** `IShippingService.GetShippingOptionsForBasket()` (called at `InvoiceService.cs:108`) internally calls `DefaultOrderGroupingStrategy.GroupItemsAsync()`. This means updating the strategy will automatically fix both:
1. The checkout flow (via `ShippingService`)
2. Direct strategy calls (if any)

**No separate changes needed to `ShippingService`** - the integration flows through the strategy.

### Edge Case: Products with No Valid Shipping Options

**Scenario:** A product has `AllowExternalCarrierShipping = false` but the warehouse serving it has NO flat-rate `ShippingOption` records configured.

**Result:** The customer would see zero shipping options for that product's order group.

**Mitigation:**
1. **Admin Validation:** When saving `ProductRoot.AllowExternalCarrierShipping = false`, warn if no flat-rate options exist for any associated warehouse.
2. **Checkout Graceful Handling:** If `AvailableShippingOptions` is empty for a group, display a clear message: "Shipping unavailable for this item. Please contact support."
3. **Order Creation Guard:** `InvoiceService.CreateOrderFromBasketAsync()` should fail with a clear error if attempting to create an order for a group with no selected shipping option.

```csharp
// Add to DefaultOrderGroupingStrategy after populating options
if (!options.Any())
{
    logger.LogWarning(
        "No shipping options available for warehouse {WarehouseId}. " +
        "Check that flat-rate options are configured or external providers are enabled.",
        warehouseId);
}
```

### Rate Quote Expiration Between Selection and Order Creation

**Problem:** User selects "FedEx Ground $15.99" but by the time they complete payment (minutes/hours later), the cached rate has expired and a new rate fetch returns "$18.99".

**Decision: Honor the quoted rate**

```csharp
// In Order model - store the rate at selection time
public class Order
{
    // ... existing fields ...

    /// <summary>
    /// The shipping rate quoted to the customer at selection time.
    /// Used for reconciliation if actual carrier rate differs at fulfillment.
    /// </summary>
    public decimal QuotedShippingCost { get; set; }

    /// <summary>
    /// When the shipping rate was quoted (from cache).
    /// </summary>
    public DateTime? QuotedAt { get; set; }
}
```

**Implementation:**
1. When user selects a shipping option, store `QuotedShippingCost` and `QuotedAt` in `CheckoutSession`
2. At order creation, use the quoted rate (not a fresh fetch)
3. If quote is older than 24 hours, consider re-fetching and warning user if rate changed significantly (>10%)
4. For reporting/reconciliation: track `QuotedShippingCost` vs actual carrier invoice

### SelectionKey Delimiter Edge Cases

**Issue:** FedEx/UPS service codes typically don't contain colons, but edge cases exist. If a service code ever contained a colon (e.g., hypothetical `EXPRESS:MORNING`), the parsing `dyn:fedex:EXPRESS:MORNING` would be ambiguous.

**Solution:** Use a delimiter unlikely to appear in service codes. Options:

| Option | Format | Pros | Cons |
|--------|--------|------|------|
| **Double colon** | `dyn::fedex::FEDEX_GROUND` | Clear separation | Slightly longer |
| **Pipe** | `dyn|fedex|FEDEX_GROUND` | Single char, rare in codes | Needs URL encoding |
| **Tilde** | `dyn~fedex~FEDEX_GROUND` | Single char, very rare | Unusual |

**Recommendation:** Keep single colon but parse from the RIGHT side:

```csharp
// Updated parsing in SelectionKeyExtensions.TryParse
if (key.StartsWith("dyn:", StringComparison.Ordinal))
{
    var remainder = key.AsSpan(4);
    var colonIndex = remainder.IndexOf(':');
    if (colonIndex > 0)
    {
        providerKey = remainder[..colonIndex].ToString();
        // Everything after the first colon is the service code (handles codes with colons)
        serviceCode = remainder[(colonIndex + 1)..].ToString();
        return !string.IsNullOrEmpty(providerKey) && !string.IsNullOrEmpty(serviceCode);
    }
}
```

This means `dyn:fedex:EXPRESS:MORNING` parses as:
- `providerKey = "fedex"`
- `serviceCode = "EXPRESS:MORNING"` ✓

### Checkout Session Migration (MVP Deployment)

Even for MVP with a clean database, there may be active checkout sessions at deployment time.

**Scenarios:**
1. User has basket with old `SelectedShippingOptions` format (`Dict<Guid, Guid>`)
2. User has checkout in progress with shipping selected

**Recommendation:** Since `SelectedShippingOptions` is not persisted to DB (stored in session/cookie), deployment will effectively clear sessions:

1. **If using in-memory session:** Deployment restarts app, sessions are lost
2. **If using Redis/distributed session:** Old format will fail to parse

**Graceful Handling:**
```csharp
// In CheckoutService when loading session
public Dictionary<Guid, string> ParseSelectedShippingOptions(string? json)
{
    if (string.IsNullOrEmpty(json)) return [];

    // Try new format first
    var newFormat = JsonSerializer.Deserialize<Dictionary<Guid, string>>(json, JsonOptions);
    if (newFormat != null) return newFormat;

    // Fallback: try old format (Dict<Guid, Guid>)
    try
    {
        var oldFormat = JsonSerializer.Deserialize<Dictionary<Guid, Guid>>(json, JsonOptions);
        if (oldFormat != null)
        {
            // Convert old format to new (Guid → "so:{Guid}")
            return oldFormat.ToDictionary(
                kv => kv.Key,
                kv => $"so:{kv.Value}");
        }
    }
    catch { /* Ignore parse errors */ }

    return [];
}
```

### Order Editing DTOs (IMPORTANT)

Order editing functionality relies on several DTOs that reference `ShippingOptionId` as a `Guid`. These MUST support SelectionKey format:

| DTO | Field | Change Required |
|-----|-------|-----------------|
| `AddProductToOrderDto.cs` | `ShippingOptionId: Guid` | Change to `ShippingSelectionKey: string` for SelectionKey support |
| `AddCustomItemDto.cs` | `ShippingOptionId: Guid?` | Change to `ShippingSelectionKey: string?` for SelectionKey support |
| `LineItemForEditDto.cs` | If has shipping field | Verify and update if needed |

**Alternative approach:** Keep `ShippingOptionId` for flat-rate backward compat, add new `ShippingSelectionKey` property that takes precedence when set.

```csharp
// AddProductToOrderDto.cs
public class AddProductToOrderDto
{
    // EXISTING - Keep for flat-rate backward compat
    public Guid ShippingOptionId { get; set; }

    // NEW - Takes precedence when set (for dynamic providers)
    public string? ShippingSelectionKey { get; set; }

    // Effective selection key (computed for validation/processing)
    public string EffectiveSelectionKey => !string.IsNullOrEmpty(ShippingSelectionKey)
        ? ShippingSelectionKey
        : ShippingOptionId != Guid.Empty
            ? $"so:{ShippingOptionId}"
            : null!;
}
```

### Order Edit Flow for Dynamic Providers

When customer service needs to change shipping on an existing order with a dynamic provider selection:

**Current Flow (flat-rate):**
1. Load order with `ShippingOptionId`
2. Lookup `ShippingOption` record
3. Show available options from same warehouse
4. User selects new option
5. Update `Order.ShippingOptionId`

**New Flow (dynamic providers):**
1. Load order with `ShippingProviderKey` + `ShippingServiceCode`
2. If `ShippingOptionId == Guid.Empty` (dynamic), call `ShippingQuoteService.GetQuotesForWarehouseAsync()` to get fresh rates
3. Show available options (both flat-rate and dynamic)
4. User selects new option (SelectionKey)
5. Parse SelectionKey and update appropriate fields

**InvoiceService.UpdateOrderShipping:**
```csharp
public async Task UpdateOrderShippingAsync(
    Guid orderId,
    string selectionKey,
    CancellationToken ct = default)
{
    var order = await GetOrderAsync(orderId, ct);

    if (SelectionKeyExtensions.TryParse(selectionKey, out var optionId, out var providerKey, out var serviceCode))
    {
        if (optionId.HasValue)
        {
            // Flat-rate: lookup cost from ShippingOption + ShippingCostResolver
            var shippingOption = await db.ShippingOptions.FindAsync(optionId.Value);
            order.ShippingOptionId = optionId.Value;
            order.ShippingProviderKey = shippingOption?.ProviderKey;
            order.ShippingServiceCode = shippingOption?.ServiceType;
            order.ShippingServiceName = shippingOption?.Name;
            order.ShippingCost = shippingCostResolver.GetTotalShippingCost(shippingOption, ...) ?? 0;
        }
        else
        {
            // Dynamic: need fresh quote to get current rate
            var quotes = await shippingQuoteService.GetQuotesForWarehouseAsync(order.WarehouseId, ...);
            var level = quotes
                .Where(q => q.ProviderKey == providerKey)
                .SelectMany(q => q.ServiceLevels)
                .FirstOrDefault(l => l.ServiceCode == serviceCode);

            if (level == null)
                throw new InvalidOperationException($"Service {providerKey}:{serviceCode} no longer available");

            order.ShippingOptionId = Guid.Empty;
            order.ShippingProviderKey = providerKey;
            order.ShippingServiceCode = serviceCode;
            order.ShippingServiceName = level.ServiceName;
            order.ShippingCost = level.TotalCost;
        }
    }
}
```

### API Rate Limiting Details

**FedEx Rate Limits:**
- Production: 300 transactions per second (TPS) default, varies by account tier
- Sandbox: 100 TPS
- Exceeded limit returns HTTP 429 with `Retry-After` header

**UPS Rate Limits:**
- Production: 100 TPS default
- Exceeded limit returns HTTP 429

**Implementation:**
```csharp
// In FedExApiClient
private static readonly SemaphoreSlim _rateLimiter = new(100, 100); // Max concurrent

public async Task<T> CallApiWithRetryAsync<T>(Func<Task<T>> apiCall, CancellationToken ct)
{
    await _rateLimiter.WaitAsync(ct);
    try
    {
        try
        {
            return await apiCall();
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.TooManyRequests)
        {
            // Extract Retry-After header
            var retryAfter = TimeSpan.FromSeconds(5); // Default
            _logger.LogWarning("FedEx rate limit hit, waiting {RetryAfter}", retryAfter);

            await Task.Delay(retryAfter, ct);
            return await apiCall(); // Single retry
        }
    }
    finally
    {
        _rateLimiter.Release();
    }
}
```

**Cache Strategy to Minimize API Calls:**
- Service Availability: 1hr TTL (routes don't change frequently)
- Rate Quotes: 10min TTL (prices can change)
- Fallback Cache: 4hr TTL (stale is better than nothing)

### Files to Modify - Additions

**NOTE:** The following items have been incorporated into the main "Files To Modify" tables above. This section is retained for cross-reference only.

- `CheckoutService.cs` - Added to Checkout (Phase 4) table with backward-compatible parsing note
- `CheckoutSession.cs` - Already in Checkout (Phase 4) table
- `Order.cs` - Already in Core Models (Phase 1) table with `QuotedShippingCost`, `QuotedAt` fields
- `OrderDbMapping.cs` - Already in Core Models (Phase 1) table

### Frontend File Paths (Verified)

The frontend files are located at:

| File | Purpose |
|------|---------|
| `src/Merchello/wwwroot/js/checkout/components/single-page-checkout.js` | Main checkout component |
| `src/Merchello/wwwroot/js/checkout/components/checkout-shipping.js` | Shipping selection component |
| `src/Merchello/wwwroot/js/checkout/stores/checkout.store.js` | Checkout state management |
| `src/Merchello/wwwroot/js/checkout/services/api.js` | API calls to backend |

---

## Implementation Checklist

Use this checklist to track progress through the implementation phases.

### Stage A: Critical Path (Required)

#### Phase A.1: SelectionKey Foundation
- [ ] Create `src/Merchello.Core/Shipping/Extensions/SelectionKeyExtensions.cs`
- [ ] Implement `TryParse()` for `so:{guid}` and `dyn:{provider}:{serviceCode}` formats
- [ ] Implement `IsDynamicProvider()` and `IsShippingOption()` helpers
- [ ] Write unit tests for SelectionKey parsing

#### Phase A.2: Model Updates
- [ ] Update `ShippingOptionInfo.cs` - add `ServiceCode`, `ServiceName`, `EstimatedDeliveryDate`, `SelectionKey`
- [ ] Update `ShippingOptionDto.cs` (Checkout) - add `SelectionKey`, `ServiceCode`, `EstimatedDeliveryDate`
- [ ] Update `ShippingGroupDto.cs` - change `SelectedShippingOptionId` to `string?`
- [ ] Update `OrderGroup.cs` - change `SelectedShippingOptionId` to `string?`
- [ ] Update `CheckoutSession.cs` - change `SelectedShippingOptions` to `Dict<Guid, string>`, add `QuotedShippingCosts`
- [ ] Update `Order.cs` - add `ShippingProviderKey`, `ShippingServiceCode`, `ShippingServiceName`, `QuotedShippingCost`, `QuotedAt`
- [ ] Update `OrderDbMapping.cs` - map new columns
- [ ] Update `ShippingRateQuote.cs` - add `Metadata` property
- [ ] Create database migration for Order table changes

#### Phase A.3: ShippingQuoteService Integration
- [ ] Add `GetQuotesForWarehouseAsync()` to `IShippingQuoteService.cs`
- [ ] Implement `GetQuotesForWarehouseAsync()` in `ShippingQuoteService.cs`
- [ ] Update `DefaultOrderGroupingStrategy.cs` - inject `IShippingQuoteService`
- [ ] Add `PopulateShippingOptionsForGroupAsync()` method to strategy
- [ ] Write integration tests for quote service per-warehouse calls

#### Phase A.4: Checkout & Order Flow
- [ ] Update `OrderGroupingContext.cs` - change selection types to string
- [ ] Update `SaveShippingSelectionsParameters.cs` - change to `Dict<Guid, string>`
- [ ] Update `ShippingAutoSelector.cs` - change return types to SelectionKey
- [ ] Update `CheckoutService.cs` - handle string SelectionKey format, store `QuotedShippingCosts` on selection
- [ ] Update `CheckoutApiController.cs` - map new DTO fields
- [ ] Update `InvoiceService.cs` - parse SelectionKey, use quoted cost, store provider/service on Order
- [ ] Update `AddProductToOrderDto.cs` - add `ShippingSelectionKey` property
- [ ] Update `AddCustomItemDto.cs` - add `ShippingSelectionKey` property
- [ ] Write integration tests for end-to-end checkout flow

#### Phase A.5: Frontend Updates
- [ ] Update `checkout.store.js` - update JSDoc typedefs for `selectionKey`
- [ ] Update `checkout-shipping.js` - change `option.id` to `option.selectionKey`
- [ ] Verify `api.js` `saveShipping()` works with string values
- [ ] Add skeleton loader HTML for shipping section loading state
- [ ] Add skeleton loader CSS animations
- [ ] Wrap shipping API calls with `setShippingLoading(true/false)` in orchestrator
- [ ] Add timeout handling (8s "taking longer" message, 15s error with retry)
- [ ] Add screen reader announcement in `setShippingLoading()` method
- [ ] Add error state UI with retry button
- [ ] Test loading states manually with network throttling

#### Phase A.6: Testing & Verification
- [ ] Unit test: SelectionKey parsing (all formats)
- [ ] Integration test: basket with FedEx/UPS shows rates > $0
- [ ] Integration test: select dynamic option, complete checkout
- [ ] Integration test: verify Order has provider/service fields
- [ ] Manual test: multi-currency checkout with dynamic provider
- [ ] Manual test: tax-inclusive display with dynamic provider
- [ ] Manual test: multi-warehouse checkout with different providers

---

### Stage B: Dynamic Provider Improvements (Optional Enhancement)

#### Phase B.1: Capability Flag & Configuration
- [ ] Update `ProviderConfigCapabilities.cs` - add `HasDynamicServices`
- [ ] Create `WarehouseProviderConfig.cs` model
- [ ] Create `WarehouseProviderConfigDbMapping.cs`
- [ ] Create database migration for `merchelloWarehouseProviderConfigs`
- [ ] Create `WarehouseProviderConfigService.cs`

#### Phase B.2: Provider Interface Updates
- [ ] Update `IShippingProvider.cs` - add `GetAvailableServicesAsync()`, `GetRatesForAllServicesAsync()`
- [ ] Update `ShippingProviderBase.cs` - add default implementations
- [ ] Update `FlatRateShippingProvider.cs` - set `HasDynamicServices = false`

#### Phase B.3: FedEx Dynamic Implementation
- [ ] Update `FedExApiClient.cs` - add Service Availability API endpoint
- [ ] Implement `GetAvailableServicesAsync()` with fallback
- [ ] Implement `GetRatesForAllServicesAsync()`
- [ ] Set `HasDynamicServices = true` in FedEx metadata
- [ ] Write tests for FedEx dynamic flow

#### Phase B.4: UPS Dynamic Implementation
- [ ] Implement "request all, filter errors" approach
- [ ] Implement `GetRatesForAllServicesAsync()`
- [ ] Set `HasDynamicServices = true` in UPS metadata
- [ ] Write tests for UPS dynamic flow

#### Phase B.5: ShippingQuoteService Dynamic Flow
- [ ] Update `FetchQuotesFromProvidersAsync` - detect `HasDynamicServices`
- [ ] Call `GetRatesForAllServicesAsync()` for dynamic providers
- [ ] Apply exclusions and markup from `WarehouseProviderConfig`

#### Phase B.6: Product Restrictions
- [ ] Add `AllowExternalCarrierShipping` to `ProductRoot.cs`
- [ ] Update `ProductRootDbMapping.cs`
- [ ] Update `DefaultOrderGroupingStrategy.cs` to filter by restriction

#### Phase B.7: Admin UI
- [ ] Create WarehouseProviderConfig management component
- [ ] Update provider setup UI for per-warehouse config
- [ ] Add "Allow external carrier shipping" checkbox to product shipping tab

#### Phase B.8: Feature Flag (Optional)
- [ ] Add `UseDynamicExternalProviders` setting to `appsettings.json`
- [ ] Update `ShippingQuoteService.cs` to check feature flag

---

## Sources

- [FedEx Service Availability API](https://developer.fedex.com/api/en-us/catalog/service-availability/docs.html)
- [FedEx Best Practices](https://developer.fedex.com/api/en-us/guides/best-practices.html)
- [UPS Developer Portal](https://developer.ups.com/)
- [Shopify FedEx Integration](https://help.shopify.com/en/manual/fulfillment/setup/shipping-rates/third-party-carrier-calculated-shipping/fedex)
- [Magento FedEx REST Migration](https://github.com/magento/magento2/issues/34642)
