# Shipping Provider Development Guide

Guide for third-party developers creating custom shipping providers.

> **Note:** Merchello includes built-in providers for Flat Rate, FedEx, and UPS. The examples in this guide use FedEx/UPS patterns to demonstrate how to build similar integrations for other carriers (DHL, USPS, Royal Mail, etc.).

## Quick Start

1. Create .NET Class Library project
2. Reference `Merchello.Core` NuGet package
3. Implement `IShippingProvider` or extend `ShippingProviderBase`
4. Package as NuGet
5. Install - Merchello auto-discovers via assembly scanning

## Provider Capabilities

| Capability | Description | Example Use Case |
|------------|-------------|------------------|
| `SupportsRealTimeRates` | Fetches live rates from carrier API | FedEx, UPS, DHL |
| `SupportsTracking` | Provides tracking URLs | All major carriers |
| `SupportsLabelGeneration` | Creates shipping labels | Carrier integrations |
| `SupportsDeliveryDateSelection` | Customer picks delivery date | Premium delivery |
| `SupportsInternational` | Handles cross-border shipments | Global carriers |
| `RequiresFullAddress` | Needs complete address (not just postal) | Most carrier APIs |
| `SupportedCountries` | Restrict to specific countries | Regional carriers |

## Configuration Field Types

| Type | Use For |
|------|---------|
| `Text` | API keys, account numbers |
| `Password` | Secrets, tokens (masked in UI) |
| `Textarea` | Multi-line config, JSON |
| `Checkbox` | Boolean flags |
| `Select` | Dropdown options |
| `Url` | Endpoint URLs with validation |
| `Number` | Integer values (days, counts) |
| `Currency` | Monetary values with formatting |
| `Percentage` | Percentage values (0-100) |

## Configuration Capabilities

Providers declare their configuration capabilities via `ConfigCapabilities`. This determines which UI elements are shown when configuring shipping methods:

```csharp
public record ProviderConfigCapabilities
{
    public bool HasLocationBasedCosts { get; init; }  // Show costs table
    public bool HasWeightTiers { get; init; }         // Show weight tiers table
    public bool UsesLiveRates { get; init; }          // Fetches rates from external carrier API
    public bool RequiresGlobalConfig { get; init; }   // Needs API credentials first
}
```

| Provider Type | HasLocationBasedCosts | HasWeightTiers | UsesLiveRates | RequiresGlobalConfig |
|---------------|----------------------|----------------|---------------|----------------------|
| Flat Rate | true | true | false | false |
| UPS/FedEx | false | false | true | true |
| Free Shipping | false | false | false | false |

**`UsesLiveRates`**: When `true`, the provider fetches rates from an external carrier API (e.g. FedEx, UPS). It does not require pre-configured `ShippingOption` records per service type. Instead, it queries the carrier API and returns all available services for the route. Per-warehouse configuration (markup, exclusions) is managed via `WarehouseProviderConfig` rather than individual ShippingOptions.

## Types of Configuration

Providers can have up to three types of configuration:

1. **Global Configuration** (`GetConfigurationFieldsAsync`)
   - API credentials, account numbers, environment selection
   - Stored in `merchelloShippingProviderConfigurations` table
   - Required before provider can be used (if `RequiresGlobalConfig = true`)

2. **Per-Method Configuration** (`GetMethodConfigFieldsAsync`) — *non-dynamic providers only*
   - Method name, delivery days, markup percentage
   - Stored in `ShippingOption.ProviderSettings` as JSON
   - Each warehouse can have multiple methods from same provider
   - Service type selection is handled via `GetSupportedServiceTypesAsync`

3. **Per-Warehouse Provider Configuration** (`WarehouseProviderConfig`) — *dynamic providers only*
   - Default markup percentage, per-service markup overrides
   - Service exclusions (hide specific services at a warehouse)
   - Delivery time overrides
   - Stored in `merchelloWarehouseProviderConfigs` table
   - One record per provider/warehouse combination

---

## Service Types Model

External providers must declare their supported service types via `GetSupportedServiceTypesAsync`. This provides:

- **Type Safety**: No magic strings - service types are concrete models
- **DRY**: Display names defined once, not duplicated in code
- **UI Generation**: Dropdowns auto-generated from provider metadata

The `ShippingServiceType` record is defined in [ShippingServiceType.cs](../src/Merchello.Core/Shipping/Models/ShippingServiceType.cs):

```csharp
/// <summary>
/// Concrete model for shipping service types.
/// </summary>
public record ShippingServiceType
{
    public required string Code { get; init; }         // e.g., "FEDEX_GROUND"
    public required string DisplayName { get; init; } // e.g., "FedEx Ground"
    public string? Description { get; init; }         // Optional details
    public required string ProviderKey { get; init; } // e.g., "fedex"
}
```

### Implementing GetSupportedServiceTypesAsync

External providers should define their service types as a static list:

```csharp
private static readonly IReadOnlyList<ShippingServiceType> SupportedServiceTypes =
[
    new ShippingServiceType { Code = "FEDEX_GROUND", DisplayName = "FedEx Ground", ProviderKey = "fedex" },
    new ShippingServiceType { Code = "FEDEX_2_DAY", DisplayName = "FedEx 2Day", ProviderKey = "fedex" },
    new ShippingServiceType { Code = "STANDARD_OVERNIGHT", DisplayName = "FedEx Standard Overnight", ProviderKey = "fedex" }
];

public override ValueTask<IReadOnlyList<ShippingServiceType>> GetSupportedServiceTypesAsync(
    CancellationToken cancellationToken = default)
{
    return ValueTask.FromResult(SupportedServiceTypes);
}
```

### Using ServiceType in GetRatesAsync

Set the `ServiceType` property on `ShippingServiceLevel` instead of using `ExtendedProperties`:

```csharp
// Create a lookup for O(1) service type resolution
private static readonly Dictionary<string, ShippingServiceType> ServiceTypeLookup =
    SupportedServiceTypes.ToDictionary(st => st.Code, StringComparer.OrdinalIgnoreCase);

public override async Task<ShippingRateQuote?> GetRatesAsync(
    ShippingQuoteRequest request, CancellationToken ct = default)
{
    var response = await _carrierClient.GetRatesAsync(request, ct);

    var serviceLevels = response.Rates.Select(rate =>
    {
        // Resolve concrete service type from lookup
        var serviceType = ServiceTypeLookup.GetValueOrDefault(rate.ServiceCode);

        return new ShippingServiceLevel
        {
            ServiceCode = $"fedex-{rate.ServiceCode.ToLower()}",
            ServiceName = serviceType?.DisplayName ?? rate.ServiceName,
            TotalCost = rate.TotalCost,
            CurrencyCode = rate.CurrencyCode,
            ServiceType = serviceType ?? new ShippingServiceType
            {
                Code = rate.ServiceCode,
                DisplayName = rate.ServiceName,
                ProviderKey = Metadata.Key
            },
            ExtendedProperties = new Dictionary<string, string>
            {
                ["trackingUrlTemplate"] = "https://carrier.com/track?num={trackingNumber}"
            }
        };
    }).ToList();

    return new ShippingRateQuote
    {
        ProviderKey = Metadata.Key,
        ProviderName = Metadata.DisplayName,
        ServiceLevels = serviceLevels
    };
}
```

---

## GetRatesForServicesAsync (Non-Dynamic Providers)

For providers with `UsesLiveRates = false`, implement `GetRatesForServicesAsync` to support per-warehouse service filtering via ShippingOption records:

```csharp
public override async Task<ShippingRateQuote?> GetRatesForServicesAsync(
    ShippingQuoteRequest request,
    IReadOnlyList<string> serviceTypes,           // ["FEDEX_GROUND", "FEDEX_2_DAY"]
    IReadOnlyList<ShippingOptionSnapshot> options, // Contains markup settings per service
    CancellationToken ct = default)
{
    // 1. Fetch rates from carrier API
    var quote = await GetRatesAsync(request, ct);
    if (quote == null) return null;

    // 2. Filter to only requested service types using the ServiceType property
    var serviceTypeSet = new HashSet<string>(serviceTypes, StringComparer.OrdinalIgnoreCase);
    var filteredLevels = quote.ServiceLevels
        .Where(sl => sl.ServiceType?.Code is not null && serviceTypeSet.Contains(sl.ServiceType.Code))
        .Select(sl =>
        {
            var option = options.FirstOrDefault(o =>
                string.Equals(o.ServiceType, sl.ServiceType!.Code, StringComparison.OrdinalIgnoreCase));

            // Apply markup from ProviderSettings
            var markup = GetMarkupFromSettings(option?.ProviderSettings);
            var adjustedCost = sl.TotalCost * (1 + markup / 100);

            return new ShippingServiceLevel
            {
                ServiceCode = sl.ServiceCode,
                ServiceName = option?.Name ?? sl.ServiceName,
                TotalCost = adjustedCost,
                CurrencyCode = sl.CurrencyCode,
                ServiceType = sl.ServiceType,
                ExtendedProperties = sl.ExtendedProperties
            };
        })
        .ToList();

    return new ShippingRateQuote
    {
        ProviderKey = Metadata.Key,
        ProviderName = Metadata.DisplayName,
        ServiceLevels = filteredLevels
    };
}
```

**Why this matters:**
- Without this, FedEx would return ALL service types regardless of warehouse configuration
- Product restrictions (`AllowedShippingOptions`/`ExcludedShippingOptions`) only work when services are ShippingOption records
- Each warehouse can enable different services (East Coast: Ground only, West Coast: Ground + 2Day)

The default `ShippingProviderBase` implementation calls `GetRatesAsync` and filters by `serviceLevel.ServiceType?.Code`.

---

## Dynamic Provider Methods

When `UsesLiveRates = true`, providers use a different set of methods. Instead of requiring pre-configured `ShippingOption` records per service type, dynamic providers query the carrier API and return all available services, with per-warehouse settings managed via `WarehouseProviderConfig`.

### GetAvailableServicesAsync

Discovers available services for a specific origin/destination route. Used by the UI to show which services are available before fetching rates.

```csharp
public override Task<IReadOnlyList<ShippingServiceType>?> GetAvailableServicesAsync(
    string originCountryCode,
    string originPostalCode,
    string destinationCountryCode,
    string? destinationPostalCode = null,
    CancellationToken cancellationToken = default)
{
    // Option A: Return static list if carrier API handles route filtering at rate time
    // (FedEx and UPS use this approach - their Rate API only returns available services)
    return Task.FromResult<IReadOnlyList<ShippingServiceType>?>(SupportedServiceTypes);

    // Option B: Query carrier's Service Availability API for route-specific services
    // var services = await _apiClient.GetServicesForRouteAsync(
    //     originCountryCode, destinationCountryCode, cancellationToken);
    // return services;
}
```

**Return `null`** from the base implementation if your provider does not support dynamic discovery (the default `ShippingProviderBase` behaviour). This signals the system to fall back to `GetSupportedServiceTypesAsync`.

### GetRatesForAllServicesAsync

Fetches rates for ALL available services on the route, then applies `WarehouseProviderConfig` settings (exclusions and markup). This is the primary rate-fetching method for dynamic providers.

```csharp
public override async Task<ShippingRateQuote?> GetRatesForAllServicesAsync(
    ShippingQuoteRequest request,
    WarehouseProviderConfig warehouseConfig,
    CancellationToken cancellationToken = default)
{
    // 1. Get all available rates from carrier API
    var quote = await GetRatesAsync(request, cancellationToken);
    if (quote == null) return null;

    // 2. Apply warehouse config: exclusions and per-service markup
    List<ShippingServiceLevel> filteredLevels = [];

    foreach (var sl in quote.ServiceLevels)
    {
        var serviceCode = sl.ServiceType?.Code ?? sl.ServiceCode;

        // Skip excluded services
        if (warehouseConfig.IsServiceExcluded(serviceCode))
            continue;

        // Apply markup (per-service override or default)
        var markupPercent = warehouseConfig.GetMarkupForService(serviceCode);
        var totalCost = sl.TotalCost;

        if (markupPercent > 0m)
        {
            totalCost = sl.TotalCost * (1 + (markupPercent / 100m));
            totalCost = _currencyService.Round(totalCost, sl.CurrencyCode);
        }

        filteredLevels.Add(new ShippingServiceLevel
        {
            ServiceCode = sl.ServiceCode,
            ServiceName = sl.ServiceName,
            TotalCost = totalCost,
            CurrencyCode = sl.CurrencyCode,
            TransitTime = sl.TransitTime,
            EstimatedDeliveryDate = sl.EstimatedDeliveryDate,
            Description = sl.Description,
            ServiceType = sl.ServiceType,
            ExtendedProperties = sl.ExtendedProperties
        });
    }

    return new ShippingRateQuote
    {
        ProviderKey = quote.ProviderKey,
        ProviderName = quote.ProviderName,
        ServiceLevels = filteredLevels.OrderBy(s => s.TotalCost).ToList(),
        Errors = quote.Errors
    };
}
```

### WarehouseProviderConfig Model

Per-warehouse configuration for dynamic providers. The system passes this to `GetRatesForAllServicesAsync`:

```csharp
public class WarehouseProviderConfig
{
    public Guid Id { get; set; }
    public Guid WarehouseId { get; set; }
    public string ProviderKey { get; set; }
    public bool IsEnabled { get; set; } = true;

    // Markup
    public decimal DefaultMarkupPercent { get; set; }           // Applied to all services
    public string? ServiceMarkupsJson { get; set; }             // {"FEDEX_GROUND": 5, "FEDEX_2_DAY": 15}

    // Exclusions
    public string? ExcludedServiceTypesJson { get; set; }       // ["FIRST_OVERNIGHT"]

    // Delivery time overrides
    public int? DefaultDaysFromOverride { get; set; }
    public int? DefaultDaysToOverride { get; set; }

    // Helper methods
    public decimal GetMarkupForService(string serviceCode);     // Per-service override or default
    public bool IsServiceExcluded(string serviceCode);          // Check exclusion list
}
```

**Configuration hierarchy**: Per-service markup override → Default markup percent → 0% (no markup).

### Dynamic vs Non-Dynamic: When to Use Each

| Aspect | Non-Dynamic (`UsesLiveRates = false`) | Dynamic (`UsesLiveRates = true`) |
|--------|---------------------------------------------|---------------------------------------|
| Config model | `ShippingOption` per service type | `WarehouseProviderConfig` per provider |
| Rate method | `GetRatesForServicesAsync` | `GetRatesForAllServicesAsync` |
| Service discovery | Admin selects from `GetSupportedServiceTypesAsync` | Carrier API returns available services |
| Markup | Per-ShippingOption `ProviderSettings` JSON | `WarehouseProviderConfig` markup fields |
| Exclusions | Don't create ShippingOption for unwanted services | `ExcludedServiceTypesJson` list |
| SelectionKey | `so:{shippingOptionId}` | `dyn:{providerKey}:{serviceCode}` |
| Use case | Providers where admin pre-selects specific services | Carriers where all services should be available |

### Fallback Rates

Dynamic providers can signal that rates are from cache (when the carrier API is unavailable):

```csharp
return new ShippingRateQuote
{
    ProviderKey = Metadata.Key,
    ProviderName = Metadata.DisplayName,
    ServiceLevels = cachedLevels,
    IsFallbackRate = true,
    FallbackReason = "carrier_api_unavailable"
};
```

The `IsFallbackRate` and `FallbackReason` are propagated to `ShippingOptionInfo` so the frontend can display a warning to the customer.

---

## Currency Conversion for External Providers

External carrier APIs (FedEx, UPS, DHL, etc.) return rates in the carrier account's currency, which may differ from the customer's basket currency. **All live providers MUST convert rates to the request currency** for multi-currency stores to work correctly.

### Required Dependencies

Live shipping providers need these dependencies for currency conversion:

```csharp
public class MyCarrierProvider(
    IOptions<MerchelloSettings> settings,
    IExchangeRateCache exchangeRateCache,
    ICurrencyService currencyService) : ShippingProviderBase
{
    private readonly MerchelloSettings _settings = settings.Value;
    private readonly IExchangeRateCache _exchangeRateCache = exchangeRateCache;
    private readonly ICurrencyService _currencyService = currencyService;
    // ...
}
```

### Currency Conversion Pattern

In `GetRatesAsync`, after fetching rates from the carrier API:

```csharp
public override async Task<ShippingRateQuote?> GetRatesAsync(
    ShippingQuoteRequest request,
    CancellationToken cancellationToken = default)
{
    // Determine request currency (basket currency or store default)
    var requestCurrency = request.CurrencyCode ?? _settings.StoreCurrencyCode;
    var errors = new List<string>();

    // ... fetch rates from carrier API ...
    var response = await _carrierClient.GetRatesAsync(/* ... */);

    // Determine carrier response currency
    var carrierCurrency = response.Currency ?? "USD";

    // Get exchange rate if carrier currency differs from request currency
    decimal? carrierToRequestRate = null;
    if (!string.Equals(carrierCurrency, requestCurrency, StringComparison.OrdinalIgnoreCase))
    {
        carrierToRequestRate = await _exchangeRateCache.GetRateAsync(
            carrierCurrency, requestCurrency, cancellationToken);

        if (!carrierToRequestRate.HasValue || carrierToRequestRate.Value <= 0m)
        {
            errors.Add($"No exchange rate available to convert from {carrierCurrency} to {requestCurrency}.");
        }
    }

    // Build service levels with converted costs
    foreach (var rate in response.Rates)
    {
        var totalCost = rate.TotalCost;
        var displayCurrency = requestCurrency;

        // Convert to request currency if rate available
        if (carrierToRequestRate.HasValue)
        {
            totalCost = _currencyService.Round(totalCost * carrierToRequestRate.Value, requestCurrency);
        }
        else if (!string.Equals(carrierCurrency, requestCurrency, StringComparison.OrdinalIgnoreCase))
        {
            // No exchange rate - use carrier currency as-is
            displayCurrency = carrierCurrency;
        }

        serviceLevels.Add(new ShippingServiceLevel
        {
            TotalCost = totalCost,
            CurrencyCode = displayCurrency,
            // ... other properties
        });
    }

    return new ShippingRateQuote
    {
        ServiceLevels = serviceLevels,
        Errors = errors
    };
}
```

### Key Points

| Aspect | Guidance |
|--------|----------|
| **Exchange rate source** | Use `IExchangeRateCache.GetRateAsync()` - it handles caching and cross-rate calculations |
| **Rounding** | Always use `ICurrencyService.Round()` - handles 0, 2, and 3-decimal currencies correctly |
| **Missing rate** | Add error to list but don't crash - return rates in original currency as fallback |
| **Same currency** | Skip conversion entirely when carrier currency matches request currency |

### Markup with Currency Conversion

When applying markup after currency conversion, use `ICurrencyService.Round()`:

```csharp
// In GetRatesForServicesAsync
if (markup > 0)
{
    totalCost = sl.TotalCost * (1 + markup / 100m);
    totalCost = _currencyService.Round(totalCost, sl.CurrencyCode);
}
```

> **Important:** This is critical for multi-currency stores. Without currency conversion, customers in different currencies will see incorrect shipping costs.

---

## Tax Handling for Shipping Rates

### Important: Rates Should Be Tax-Exclusive (Default)

By default, Merchello assumes all shipping rates are **tax-exclusive** (the cost of shipping only, before any applicable sales tax or VAT). Tax is calculated separately based on destination jurisdiction using the configured tax provider (ManualTaxProvider, Avalara, etc.).

This is the standard behavior for carrier APIs like FedEx, UPS, and DHL, which return transportation charges only.

### The `RatesIncludeTax` Flag

If your provider returns **tax-inclusive** rates (uncommon), set `RatesIncludeTax = true` in metadata:

```csharp
public override ShippingProviderMetadata Metadata => new()
{
    Key = "my-provider",
    DisplayName = "My Provider",
    // ... other properties ...
    RatesIncludeTax = true  // Rates already include VAT/GST
};
```

When `RatesIncludeTax = true`:
- The system will **NOT** calculate additional shipping tax for orders using this provider
- The rate is assumed to already include all applicable taxes
- Use this for carrier accounts configured for gross (inclusive) pricing

### When to Use Each Approach

| Scenario | RatesIncludeTax | Notes |
|----------|-----------------|-------|
| FedEx, UPS, DHL (standard) | `false` (default) | APIs return net transportation charges |
| European carrier with VAT-inclusive pricing | `true` | Some EU carriers return gross rates |
| Carrier account configured for gross rates | `true` | Check your carrier account settings |
| Flat rate shipping | `false` (default) | Store owner sets net rates, tax calculated separately |

### Converting Gross to Net (Alternative)

If your carrier API returns VAT-inclusive rates but you want Merchello to handle tax calculation, you can convert gross to net before returning:

```csharp
// Convert gross to net before returning (alternative to RatesIncludeTax = true)
var vatRate = 0.20m; // 20% VAT
var netRate = grossRate / (1 + vatRate);
return new ShippingServiceLevel { TotalCost = netRate, ... };
```

### Verification

When implementing a new provider, verify that:
1. Carrier account is configured for net pricing (recommended)
2. Test rates match carrier website before tax
3. Tax is calculated correctly at checkout
4. If using tax-inclusive rates, set `RatesIncludeTax = true` in metadata

---

## Example 1: FedEx (Dynamic Real-Time Rates)

```csharp
public class FedExShippingProvider(
    IOptions<MerchelloSettings> settings,
    IExchangeRateCache exchangeRateCache,
    ICurrencyService currencyService) : ShippingProviderBase, IDisposable
{
    private readonly MerchelloSettings _settings = settings.Value;
    private readonly IExchangeRateCache _exchangeRateCache = exchangeRateCache;
    private readonly ICurrencyService _currencyService = currencyService;

    private FedExApiClient? _apiClient;

    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "fedex",
        DisplayName = "FedEx",
        Icon = "icon-truck",
        Description = "Real-time FedEx shipping rates via FedEx REST API",
        SupportsRealTimeRates = true,
        SupportsTracking = true,
        SupportsLabelGeneration = false,
        SupportsDeliveryDateSelection = false,
        SupportsInternational = true,
        RequiresFullAddress = true,
        SetupInstructions = "Create a FedEx Developer account at developer.fedex.com to obtain API credentials.",
        ConfigCapabilities = new ProviderConfigCapabilities
        {
            HasLocationBasedCosts = false,
            HasWeightTiers = false,
            UsesLiveRates = true,
            RequiresGlobalConfig = true
        }
    };

    // Define supported service types once - used for UI dropdowns and rate mapping
    private static readonly IReadOnlyList<ShippingServiceType> SupportedServiceTypes =
    [
        new ShippingServiceType { Code = "FEDEX_GROUND", DisplayName = "FedEx Ground", ProviderKey = "fedex" },
        new ShippingServiceType { Code = "FEDEX_2_DAY", DisplayName = "FedEx 2Day", ProviderKey = "fedex" },
        new ShippingServiceType { Code = "FEDEX_2_DAY_AM", DisplayName = "FedEx 2Day A.M.", ProviderKey = "fedex" },
        new ShippingServiceType { Code = "STANDARD_OVERNIGHT", DisplayName = "FedEx Standard Overnight", ProviderKey = "fedex" },
        new ShippingServiceType { Code = "PRIORITY_OVERNIGHT", DisplayName = "FedEx Priority Overnight", ProviderKey = "fedex" },
        new ShippingServiceType { Code = "FIRST_OVERNIGHT", DisplayName = "FedEx First Overnight", ProviderKey = "fedex" },
        new ShippingServiceType { Code = "INTERNATIONAL_ECONOMY", DisplayName = "FedEx International Economy", ProviderKey = "fedex" },
        new ShippingServiceType { Code = "INTERNATIONAL_PRIORITY", DisplayName = "FedEx International Priority", ProviderKey = "fedex" }
    ];

    // O(1) lookup for service type resolution
    private static readonly Dictionary<string, ShippingServiceType> ServiceTypeLookup =
        SupportedServiceTypes.ToDictionary(st => st.Code, StringComparer.OrdinalIgnoreCase);

    // Declare supported service types - UI generates dropdown from this
    public override ValueTask<IReadOnlyList<ShippingServiceType>> GetSupportedServiceTypesAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult(SupportedServiceTypes);
    }

    // GLOBAL CONFIG: API credentials (uses OAuth with Client ID/Secret)
    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new() { Key = "clientId", Label = "API Key (Client ID)", FieldType = ConfigurationFieldType.Text, IsRequired = true },
            new() { Key = "clientSecret", Label = "Secret Key", FieldType = ConfigurationFieldType.Password, IsSensitive = true, IsRequired = true },
            new() { Key = "accountNumber", Label = "Account Number", FieldType = ConfigurationFieldType.Text, IsRequired = true },
            new() { Key = "environment", Label = "Environment", FieldType = ConfigurationFieldType.Select, IsRequired = true,
                    DefaultValue = "sandbox",
                    Options = [new("sandbox", "Sandbox (Testing)"), new("production", "Production (Live)")] }
        ]);
    }

    // PER-METHOD CONFIG: Additional settings (service type selection handled by GetSupportedServiceTypesAsync)
    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetMethodConfigFieldsAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new() { Key = "name", Label = "Method Name", FieldType = ConfigurationFieldType.Text, IsRequired = false,
                    Placeholder = "e.g., FedEx Ground (optional, defaults to service type name)" },
            new() { Key = "markup", Label = "Markup %", FieldType = ConfigurationFieldType.Percentage,
                    Description = "Percentage to add to FedEx rates", DefaultValue = "0" }
        ]);
    }

    public override async ValueTask ConfigureAsync(ShippingProviderConfiguration? config, CancellationToken ct = default)
    {
        await base.ConfigureAsync(config, ct);

        if (config?.SettingsJson == null) return;

        var settings = JsonSerializer.Deserialize<Dictionary<string, string>>(config.SettingsJson);
        if (settings == null) return;

        var clientId = settings.GetValueOrDefault("clientId");
        var clientSecret = settings.GetValueOrDefault("clientSecret");
        var accountNumber = settings.GetValueOrDefault("accountNumber");
        var environment = settings.GetValueOrDefault("environment") ?? "sandbox";

        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret) || string.IsNullOrEmpty(accountNumber))
            return;

        var useSandbox = environment.Equals("sandbox", StringComparison.OrdinalIgnoreCase);
        _apiClient = new FedExApiClient(clientId, clientSecret, accountNumber, useSandbox);
    }

    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        if (request.IsEstimateMode) return false;
        if (_apiClient == null) return false;
        return request.Items.Any(i => i.IsShippable && (i.TotalWeightKg ?? 0) > 0);
    }

    public override async Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request, CancellationToken ct = default)
    {
        if (!IsAvailableFor(request) || _apiClient == null) return null;

        var requestCurrency = request.CurrencyCode ?? _settings.StoreCurrencyCode;
        var response = await _apiClient.GetRatesAsync(/* ... */, ct);

        // Get exchange rate if FedEx currency differs from request currency
        var fedexCurrency = response.Currency ?? "USD";
        decimal? exchangeRate = null;
        if (!string.Equals(fedexCurrency, requestCurrency, StringComparison.OrdinalIgnoreCase))
        {
            exchangeRate = await _exchangeRateCache.GetRateAsync(fedexCurrency, requestCurrency, ct);
        }

        var serviceLevels = response.Rates.Select(rate =>
        {
            // Resolve concrete service type from lookup
            var serviceType = ServiceTypeLookup.GetValueOrDefault(rate.ServiceType);

            // Convert currency if needed
            var totalCost = rate.TotalCharge;
            var displayCurrency = requestCurrency;
            if (exchangeRate.HasValue)
            {
                totalCost = _currencyService.Round(totalCost * exchangeRate.Value, requestCurrency);
            }
            else if (!string.Equals(fedexCurrency, requestCurrency, StringComparison.OrdinalIgnoreCase))
            {
                displayCurrency = fedexCurrency; // No exchange rate, use original currency
            }

            return new ShippingServiceLevel
            {
                ServiceCode = $"fedex-{rate.ServiceType.ToLowerInvariant()}",
                ServiceName = serviceType?.DisplayName ?? rate.ServiceName,
                TotalCost = totalCost,
                CurrencyCode = displayCurrency,
                TransitTime = TimeSpan.FromDays(rate.TransitDays),
                EstimatedDeliveryDate = rate.DeliveryDate,
                ServiceType = serviceType ?? new ShippingServiceType
                {
                    Code = rate.ServiceType,
                    DisplayName = rate.ServiceName,
                    ProviderKey = Metadata.Key
                },
                ExtendedProperties = new Dictionary<string, string>
                {
                    ["trackingUrlTemplate"] = "https://www.fedex.com/fedextrack/?trknbr={trackingNumber}"
                }
            };
        }).ToList();

        return new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels = serviceLevels
        };
    }

    // Override for efficient per-service filtering with markup
    public override async Task<ShippingRateQuote?> GetRatesForServicesAsync(
        ShippingQuoteRequest request,
        IReadOnlyList<string> serviceTypes,
        IReadOnlyList<ShippingOptionSnapshot> shippingOptions,
        CancellationToken ct = default)
    {
        var allRates = await GetRatesAsync(request, ct);
        if (allRates == null) return null;

        // Filter using concrete ServiceType property
        var serviceTypeSet = new HashSet<string>(serviceTypes, StringComparer.OrdinalIgnoreCase);
        var filteredLevels = allRates.ServiceLevels
            .Where(sl => sl.ServiceType?.Code is not null && serviceTypeSet.Contains(sl.ServiceType.Code))
            .Select(sl =>
            {
                var option = shippingOptions.FirstOrDefault(o =>
                    string.Equals(o.ServiceType, sl.ServiceType!.Code, StringComparison.OrdinalIgnoreCase));

                var markup = GetMarkupFromSettings(option?.ProviderSettings);
                var adjustedCost = sl.TotalCost * (1 + markup / 100m);
                if (markup > 0)
                {
                    adjustedCost = _currencyService.Round(adjustedCost, sl.CurrencyCode);
                }

                return new ShippingServiceLevel
                {
                    ServiceCode = sl.ServiceCode,
                    ServiceName = option?.Name ?? sl.ServiceName,
                    TotalCost = adjustedCost,
                    CurrencyCode = sl.CurrencyCode,
                    TransitTime = sl.TransitTime,
                    EstimatedDeliveryDate = sl.EstimatedDeliveryDate,
                    ServiceType = sl.ServiceType,
                    ExtendedProperties = sl.ExtendedProperties
                };
            })
            .ToList();

        return new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels = filteredLevels
        };
    }

    // Dynamic service discovery: FedEx Rate API inherently filters by route,
    // so return the full static list. Actual availability determined at rate time.
    public override Task<IReadOnlyList<ShippingServiceType>?> GetAvailableServicesAsync(
        string originCountryCode, string originPostalCode,
        string destinationCountryCode, string? destinationPostalCode = null,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<ShippingServiceType>?>(SupportedServiceTypes);
    }

    // Dynamic: get all rates then apply WarehouseProviderConfig
    public override async Task<ShippingRateQuote?> GetRatesForAllServicesAsync(
        ShippingQuoteRequest request,
        WarehouseProviderConfig warehouseConfig,
        CancellationToken cancellationToken = default)
    {
        var quote = await GetRatesAsync(request, cancellationToken);
        if (quote == null) return null;

        List<ShippingServiceLevel> filteredLevels = [];
        foreach (var sl in quote.ServiceLevels)
        {
            var serviceCode = sl.ServiceType?.Code ?? sl.ServiceCode;
            if (warehouseConfig.IsServiceExcluded(serviceCode)) continue;

            var markupPercent = warehouseConfig.GetMarkupForService(serviceCode);
            var totalCost = sl.TotalCost;
            if (markupPercent > 0m)
            {
                totalCost = sl.TotalCost * (1 + (markupPercent / 100m));
                totalCost = _currencyService.Round(totalCost, sl.CurrencyCode);
            }

            filteredLevels.Add(new ShippingServiceLevel
            {
                ServiceCode = sl.ServiceCode, ServiceName = sl.ServiceName,
                TotalCost = totalCost, CurrencyCode = sl.CurrencyCode,
                TransitTime = sl.TransitTime, EstimatedDeliveryDate = sl.EstimatedDeliveryDate,
                Description = sl.Description, ServiceType = sl.ServiceType,
                ExtendedProperties = sl.ExtendedProperties
            });
        }

        return new ShippingRateQuote
        {
            ProviderKey = quote.ProviderKey, ProviderName = quote.ProviderName,
            ServiceLevels = filteredLevels.OrderBy(s => s.TotalCost).ToList(),
            Errors = quote.Errors
        };
    }

    private static decimal GetMarkupFromSettings(string? providerSettingsJson)
    {
        if (string.IsNullOrEmpty(providerSettingsJson)) return 0;
        try
        {
            var settings = JsonSerializer.Deserialize<Dictionary<string, string>>(providerSettingsJson);
            return decimal.TryParse(settings?.GetValueOrDefault("markup"), NumberStyles.Number,
                CultureInfo.InvariantCulture, out var m) ? m : 0;
        }
        catch (JsonException) { return 0; }
    }

    public void Dispose() => _apiClient?.Dispose();
}
```

---

## Example 2: UPS (Dynamic with Tracking)

```csharp
public class UpsShippingProvider(
    IOptions<MerchelloSettings> settings,
    IExchangeRateCache exchangeRateCache,
    ICurrencyService currencyService) : ShippingProviderBase, IDisposable
{
    private readonly MerchelloSettings _settings = settings.Value;
    private readonly IExchangeRateCache _exchangeRateCache = exchangeRateCache;
    private readonly ICurrencyService _currencyService = currencyService;

    private UpsApiClient? _apiClient;

    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "ups",
        DisplayName = "UPS",
        Icon = "icon-truck",
        Description = "Real-time UPS shipping rates via UPS REST API",
        SupportsRealTimeRates = true,
        SupportsTracking = true,
        SupportsLabelGeneration = false,
        SupportsDeliveryDateSelection = false,
        SupportsInternational = true,
        RequiresFullAddress = true,
        ConfigCapabilities = new ProviderConfigCapabilities
        {
            HasLocationBasedCosts = false,
            HasWeightTiers = false,
            UsesLiveRates = true,
            RequiresGlobalConfig = true
        }
    };

    // Define supported service types (domestic + international)
    private static readonly IReadOnlyList<ShippingServiceType> SupportedServiceTypes =
    [
        // Domestic US Services
        new ShippingServiceType { Code = "14", DisplayName = "UPS Next Day Air Early", ProviderKey = "ups" },
        new ShippingServiceType { Code = "01", DisplayName = "UPS Next Day Air", ProviderKey = "ups" },
        new ShippingServiceType { Code = "13", DisplayName = "UPS Next Day Air Saver", ProviderKey = "ups" },
        new ShippingServiceType { Code = "59", DisplayName = "UPS 2nd Day Air A.M.", ProviderKey = "ups" },
        new ShippingServiceType { Code = "02", DisplayName = "UPS 2nd Day Air", ProviderKey = "ups" },
        new ShippingServiceType { Code = "12", DisplayName = "UPS 3 Day Select", ProviderKey = "ups" },
        new ShippingServiceType { Code = "03", DisplayName = "UPS Ground", ProviderKey = "ups" },
        // International Services
        new ShippingServiceType { Code = "07", DisplayName = "UPS Worldwide Express", ProviderKey = "ups" },
        new ShippingServiceType { Code = "54", DisplayName = "UPS Worldwide Express Plus", ProviderKey = "ups" },
        new ShippingServiceType { Code = "08", DisplayName = "UPS Worldwide Expedited", ProviderKey = "ups" },
        new ShippingServiceType { Code = "65", DisplayName = "UPS Worldwide Saver", ProviderKey = "ups" },
        new ShippingServiceType { Code = "11", DisplayName = "UPS Standard", ProviderKey = "ups" },
        new ShippingServiceType { Code = "96", DisplayName = "UPS Worldwide Express Freight", ProviderKey = "ups" }
    ];

    private static readonly Dictionary<string, ShippingServiceType> ServiceTypeLookup =
        SupportedServiceTypes.ToDictionary(st => st.Code, StringComparer.OrdinalIgnoreCase);

    public override ValueTask<IReadOnlyList<ShippingServiceType>> GetSupportedServiceTypesAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult(SupportedServiceTypes);
    }

    // Global config: OAuth credentials (UPS uses OAuth with Client ID/Secret)
    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new() { Key = "clientId", Label = "Client ID", FieldType = ConfigurationFieldType.Text, IsRequired = true },
            new() { Key = "clientSecret", Label = "Client Secret", FieldType = ConfigurationFieldType.Password, IsSensitive = true, IsRequired = true },
            new() { Key = "accountNumber", Label = "Account Number", FieldType = ConfigurationFieldType.Text, IsRequired = true,
                    Description = "Your UPS Account/Shipper Number (6 digits)" },
            new() { Key = "environment", Label = "Environment", FieldType = ConfigurationFieldType.Select, IsRequired = true,
                    DefaultValue = "sandbox",
                    Options = [new("sandbox", "Sandbox (Testing)"), new("production", "Production (Live)")] },
            new() { Key = "useNegotiatedRates", Label = "Use Negotiated Rates", FieldType = ConfigurationFieldType.Checkbox,
                    Description = "Enable to use your negotiated/contract rates", DefaultValue = "false" }
        ]);
    }

    // Per-method config: markup (service type selection handled by GetSupportedServiceTypesAsync)
    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetMethodConfigFieldsAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new() { Key = "name", Label = "Display Name", FieldType = ConfigurationFieldType.Text, IsRequired = false },
            new() { Key = "markup", Label = "Markup %", FieldType = ConfigurationFieldType.Percentage, DefaultValue = "0" }
        ]);
    }

    public override async ValueTask ConfigureAsync(ShippingProviderConfiguration? config, CancellationToken ct = default)
    {
        await base.ConfigureAsync(config, ct);

        if (config?.SettingsJson == null) return;

        var settings = JsonSerializer.Deserialize<Dictionary<string, string>>(config.SettingsJson);
        if (settings == null) return;

        var clientId = settings.GetValueOrDefault("clientId");
        var clientSecret = settings.GetValueOrDefault("clientSecret");
        var accountNumber = settings.GetValueOrDefault("accountNumber");
        var environment = settings.GetValueOrDefault("environment") ?? "sandbox";
        var useNegotiatedRates = settings.GetValueOrDefault("useNegotiatedRates")?.Equals("true", StringComparison.OrdinalIgnoreCase) ?? false;

        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret) || string.IsNullOrEmpty(accountNumber))
            return;

        var useSandbox = environment.Equals("sandbox", StringComparison.OrdinalIgnoreCase);
        _apiClient = new UpsApiClient(clientId, clientSecret, accountNumber, useSandbox, useNegotiatedRates);
    }

    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        if (request.IsEstimateMode) return false;
        if (_apiClient == null) return false;
        return request.Items.Any(i => i.IsShippable && (i.TotalWeightKg ?? 0) > 0);
    }

    public override async Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request, CancellationToken ct = default)
    {
        if (!IsAvailableFor(request) || _apiClient == null) return null;

        var requestCurrency = request.CurrencyCode ?? _settings.StoreCurrencyCode;
        var response = await _apiClient.GetRatesAsync(/* ... */, ct);

        // Get exchange rate if UPS currency differs from request currency
        var upsCurrency = response.RatedShipment?.FirstOrDefault()?.TotalCharges?.CurrencyCode ?? "USD";
        decimal? exchangeRate = null;
        if (!string.Equals(upsCurrency, requestCurrency, StringComparison.OrdinalIgnoreCase))
        {
            exchangeRate = await _exchangeRateCache.GetRateAsync(upsCurrency, requestCurrency, ct);
        }

        return new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels = response.RatedShipment?.Select(r =>
            {
                var serviceType = ServiceTypeLookup.GetValueOrDefault(r.Service?.Code ?? "");

                // Convert currency if needed
                var totalCost = decimal.Parse(r.TotalCharges?.MonetaryValue ?? "0", CultureInfo.InvariantCulture);
                var displayCurrency = requestCurrency;
                if (exchangeRate.HasValue)
                {
                    totalCost = _currencyService.Round(totalCost * exchangeRate.Value, requestCurrency);
                }
                else if (!string.Equals(upsCurrency, requestCurrency, StringComparison.OrdinalIgnoreCase))
                {
                    displayCurrency = upsCurrency;
                }

                return new ShippingServiceLevel
                {
                    ServiceCode = $"ups-{r.Service?.Code}",
                    ServiceName = serviceType?.DisplayName ?? r.Service?.Description ?? r.Service?.Code ?? "",
                    TotalCost = totalCost,
                    CurrencyCode = displayCurrency,
                    EstimatedDeliveryDate = ParseArrivalDate(r.TimeInTransit?.ServiceSummary?.EstimatedArrival?.Arrival?.Date),
                    ServiceType = serviceType ?? new ShippingServiceType
                    {
                        Code = r.Service?.Code ?? "",
                        DisplayName = r.Service?.Description ?? r.Service?.Code ?? "",
                        ProviderKey = Metadata.Key
                    },
                    ExtendedProperties = new Dictionary<string, string>
                    {
                        ["trackingUrlTemplate"] = "https://www.ups.com/track?tracknum={trackingNumber}"
                    }
                };
            }).ToList() ?? []
        };
    }

    // Dynamic: UPS "Shop" request returns all available services for route
    public override Task<IReadOnlyList<ShippingServiceType>?> GetAvailableServicesAsync(
        string originCountryCode, string originPostalCode,
        string destinationCountryCode, string? destinationPostalCode = null,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<ShippingServiceType>?>(SupportedServiceTypes);
    }

    // Dynamic: get all rates then apply WarehouseProviderConfig
    public override async Task<ShippingRateQuote?> GetRatesForAllServicesAsync(
        ShippingQuoteRequest request,
        WarehouseProviderConfig warehouseConfig,
        CancellationToken cancellationToken = default)
    {
        var quote = await GetRatesAsync(request, cancellationToken);
        if (quote == null) return null;

        List<ShippingServiceLevel> filteredLevels = [];
        foreach (var sl in quote.ServiceLevels)
        {
            var serviceCode = sl.ServiceType?.Code ?? sl.ServiceCode;
            if (warehouseConfig.IsServiceExcluded(serviceCode)) continue;

            var markupPercent = warehouseConfig.GetMarkupForService(serviceCode);
            var totalCost = sl.TotalCost;
            if (markupPercent > 0m)
            {
                totalCost = sl.TotalCost * (1 + (markupPercent / 100m));
                totalCost = _currencyService.Round(totalCost, sl.CurrencyCode);
            }

            filteredLevels.Add(new ShippingServiceLevel
            {
                ServiceCode = sl.ServiceCode, ServiceName = sl.ServiceName,
                TotalCost = totalCost, CurrencyCode = sl.CurrencyCode,
                TransitTime = sl.TransitTime, EstimatedDeliveryDate = sl.EstimatedDeliveryDate,
                Description = sl.Description, ServiceType = sl.ServiceType,
                ExtendedProperties = sl.ExtendedProperties
            });
        }

        return new ShippingRateQuote
        {
            ProviderKey = quote.ProviderKey, ProviderName = quote.ProviderName,
            ServiceLevels = filteredLevels.OrderBy(s => s.TotalCost).ToList(),
            Errors = quote.Errors
        };
    }

    private static DateTime? ParseArrivalDate(string? dateStr)
    {
        if (string.IsNullOrEmpty(dateStr)) return null;
        return DateTime.TryParseExact(dateStr, "yyyyMMdd", null, DateTimeStyles.None, out var d) ? d : null;
    }

    public void Dispose() => _apiClient?.Dispose();
}
```

---

## Example 3: Weight-Based Tiered Shipping

```csharp
public class WeightBasedShippingProvider : ShippingProviderBase
{
    private List<WeightTier>? _tiers;

    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "weight-based",
        DisplayName = "Weight-Based Shipping",
        Icon = "icon-scale",
        Description = "Tiered shipping rates based on total weight",
        SupportsRealTimeRates = false,
        SupportsTracking = false,
        SupportsLabelGeneration = false,
        SupportsDeliveryDateSelection = false,
        SupportsInternational = true,
        RequiresFullAddress = false,
        ConfigCapabilities = new ProviderConfigCapabilities
        {
            HasLocationBasedCosts = false,  // Uses weight tiers from global config
            HasWeightTiers = false,         // Weight tiers are global, not per-method
            UsesLiveRates = false,
            RequiresGlobalConfig = true     // Weight tiers must be configured first
        }
    };

    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new()
            {
                Key = "tiers",
                Label = "Weight Tiers (JSON)",
                FieldType = ConfigurationFieldType.Textarea,
                IsRequired = true,
                Description = "JSON array: [{\"maxKg\": 1, \"cost\": 5.00}, {\"maxKg\": 5, \"cost\": 10.00}]",
                DefaultValue = "[{\"maxKg\": 1, \"cost\": 5.00}, {\"maxKg\": 5, \"cost\": 10.00}, {\"maxKg\": 20, \"cost\": 15.00}]"
            },
            new()
            {
                Key = "serviceName",
                Label = "Service Name",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                DefaultValue = "Standard Shipping"
            }
        ]);
    }

    public override ValueTask ConfigureAsync(ShippingProviderConfiguration? config, CancellationToken ct = default)
    {
        if (config?.SettingsJson != null)
        {
            var settings = JsonSerializer.Deserialize<Dictionary<string, string>>(config.SettingsJson);
            var tiersJson = settings?.GetValueOrDefault("tiers");
            if (!string.IsNullOrEmpty(tiersJson))
            {
                _tiers = JsonSerializer.Deserialize<List<WeightTier>>(tiersJson);
            }
        }
        _tiers ??= [new WeightTier { MaxKg = 100, Cost = 10.00m }];
        return ValueTask.CompletedTask;
    }

    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        return request.Items.Any(i => i.IsShippable);
    }

    public override Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request, CancellationToken ct = default)
    {
        if (!IsAvailableFor(request)) return Task.FromResult<ShippingRateQuote?>(null);

        var totalWeight = request.Items.Sum(i => i.TotalWeightKg ?? 0);
        var tier = _tiers!.OrderBy(t => t.MaxKg).FirstOrDefault(t => totalWeight <= t.MaxKg);
        var cost = tier?.Cost ?? _tiers!.Last().Cost;

        return Task.FromResult<ShippingRateQuote?>(new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels =
            [
                new ShippingServiceLevel
                {
                    ServiceCode = "weight-standard",
                    ServiceName = "Standard Shipping",
                    TotalCost = cost,
                    CurrencyCode = request.CurrencyCode ?? "GBP",
                    Description = $"Based on {totalWeight:F2} kg total weight"
                }
            ]
        });
    }

    private record WeightTier
    {
        public decimal MaxKg { get; init; }
        public decimal Cost { get; init; }
    }
}
```

---

## Example 4: Free Shipping (Conditional)

```csharp
public class FreeShippingProvider : ShippingProviderBase
{
    private decimal _minimumOrderValue;
    private string? _excludedCountries;

    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "free-shipping",
        DisplayName = "Free Shipping",
        Icon = "icon-gift",
        Description = "Free shipping for orders over a minimum value",
        SupportsRealTimeRates = false,
        SupportsTracking = false,
        SupportsLabelGeneration = false,
        SupportsDeliveryDateSelection = false,
        SupportsInternational = true,
        RequiresFullAddress = false,
        ConfigCapabilities = new ProviderConfigCapabilities
        {
            HasLocationBasedCosts = false,  // Free = no cost config needed
            HasWeightTiers = false,
            UsesLiveRates = false,
            RequiresGlobalConfig = true     // Minimum order value must be set
        }
    };

    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new()
            {
                Key = "minimumOrderValue",
                Label = "Minimum Order Value",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                DefaultValue = "50.00",
                Description = "Orders above this value qualify for free shipping"
            },
            new()
            {
                Key = "excludedCountries",
                Label = "Excluded Countries",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                Placeholder = "US,CA,AU",
                Description = "Comma-separated country codes to exclude"
            },
            new()
            {
                Key = "deliveryDays",
                Label = "Estimated Delivery Days",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                DefaultValue = "5-7"
            }
        ]);
    }

    public override ValueTask ConfigureAsync(ShippingProviderConfiguration? config, CancellationToken ct = default)
    {
        if (config?.SettingsJson != null)
        {
            var settings = JsonSerializer.Deserialize<Dictionary<string, string>>(config.SettingsJson);
            if (decimal.TryParse(settings?.GetValueOrDefault("minimumOrderValue"), out var min))
            {
                _minimumOrderValue = min;
            }
            _excludedCountries = settings?.GetValueOrDefault("excludedCountries");
        }
        return ValueTask.CompletedTask;
    }

    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        // Check minimum order value
        if (request.ItemsSubtotal < _minimumOrderValue) return false;

        // Check excluded countries
        if (!string.IsNullOrEmpty(_excludedCountries))
        {
            var excluded = _excludedCountries.Split(',').Select(c => c.Trim().ToUpperInvariant());
            if (excluded.Contains(request.CountryCode.ToUpperInvariant())) return false;
        }

        return request.Items.Any(i => i.IsShippable);
    }

    public override Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request, CancellationToken ct = default)
    {
        if (!IsAvailableFor(request)) return Task.FromResult<ShippingRateQuote?>(null);

        return Task.FromResult<ShippingRateQuote?>(new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels =
            [
                new ShippingServiceLevel
                {
                    ServiceCode = "free-standard",
                    ServiceName = "Free Shipping",
                    TotalCost = 0,
                    CurrencyCode = request.CurrencyCode ?? "GBP",
                    Description = $"Free shipping on orders over {_minimumOrderValue:C}"
                }
            ]
        });
    }
}
```

---

## Example 5: Delivery Date Selection

```csharp
public class PremiumDeliveryProvider : ShippingProviderBase
{
    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "premium-delivery",
        DisplayName = "Premium Delivery",
        Icon = "icon-calendar",
        Description = "Choose your delivery date",
        SupportsRealTimeRates = false,
        SupportsTracking = false,
        SupportsLabelGeneration = false,
        SupportsDeliveryDateSelection = true,
        SupportsInternational = false,
        RequiresFullAddress = true,
        SupportedCountries = ["GB"]
    };

    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        return request.CountryCode.Equals("GB", StringComparison.OrdinalIgnoreCase)
            && request.Items.Any(i => i.IsShippable);
    }

    public override Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request, CancellationToken ct = default)
    {
        if (!IsAvailableFor(request)) return Task.FromResult<ShippingRateQuote?>(null);

        return Task.FromResult<ShippingRateQuote?>(new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels =
            [
                new ShippingServiceLevel
                {
                    ServiceCode = "premium-choose-date",
                    ServiceName = "Choose Your Delivery Date",
                    TotalCost = 4.99m,
                    CurrencyCode = "GBP",
                    Description = "Select a specific delivery date"
                }
            ]
        });
    }

    public override Task<List<DateTime>> GetAvailableDeliveryDatesAsync(
        ShippingQuoteRequest request,
        ShippingServiceLevel serviceLevel,
        CancellationToken ct = default)
    {
        var dates = new List<DateTime>();
        var startDate = DateTime.Today.AddDays(2); // Minimum 2 days lead time

        for (var i = 0; i < 14; i++) // Next 14 days
        {
            var date = startDate.AddDays(i);
            // Exclude Sundays
            if (date.DayOfWeek != DayOfWeek.Sunday)
            {
                dates.Add(date);
            }
        }

        return Task.FromResult(dates);
    }

    public override Task<decimal> CalculateDeliveryDateSurchargeAsync(
        ShippingQuoteRequest request,
        ShippingServiceLevel serviceLevel,
        DateTime requestedDate,
        CancellationToken ct = default)
    {
        // Saturday delivery surcharge
        if (requestedDate.DayOfWeek == DayOfWeek.Saturday)
        {
            return Task.FromResult(2.00m);
        }

        return Task.FromResult(0m);
    }

    public override Task<bool> ValidateDeliveryDateAsync(
        ShippingQuoteRequest request,
        ShippingServiceLevel serviceLevel,
        DateTime requestedDate,
        CancellationToken ct = default)
    {
        // Must be at least 2 days in the future
        if (requestedDate < DateTime.Today.AddDays(2)) return Task.FromResult(false);

        // No Sundays
        if (requestedDate.DayOfWeek == DayOfWeek.Sunday) return Task.FromResult(false);

        // Within 14-day window
        if (requestedDate > DateTime.Today.AddDays(16)) return Task.FromResult(false);

        return Task.FromResult(true);
    }
}
```

---

## Frontend Integration

```typescript
interface ShippingQuote {
  providerKey: string;
  providerName: string;
  serviceLevels: ServiceLevel[];
  errors: string[];
}

interface ServiceLevel {
  serviceCode: string;
  serviceName: string;
  totalCost: number;
  currencyCode: string;
  transitTime?: string;
  estimatedDeliveryDate?: string;
  description?: string;
}

async function getShippingQuotes(basketId: string, countryCode: string, stateCode?: string): Promise<ShippingQuote[]> {
  const params = new URLSearchParams({ countryCode });
  if (stateCode) params.append('stateCode', stateCode);
  
  const response = await fetch(`/api/merchello/checkout/${basketId}/shipping?${params}`);
  return response.json();
}

// Display shipping options
function renderShippingOptions(quotes: ShippingQuote[]) {
  const container = document.getElementById('shipping-options');
  
  quotes.forEach(quote => {
    quote.serviceLevels.forEach(service => {
      const option = document.createElement('div');
      option.className = 'shipping-option';
      option.innerHTML = `
        <label>
          <input type="radio" name="shipping" 
                 value="${quote.providerKey}:${service.serviceCode}"
                 data-cost="${service.totalCost}">
          <span class="service-name">${service.serviceName}</span>
          <span class="service-cost">${formatCurrency(service.totalCost, service.currencyCode)}</span>
          ${service.estimatedDeliveryDate 
            ? `<span class="delivery-date">Est. ${formatDate(service.estimatedDeliveryDate)}</span>` 
            : ''}
        </label>
      `;
      container.appendChild(option);
    });
  });
}

// For providers with delivery date selection
async function getDeliveryDates(basketId: string, providerKey: string, serviceCode: string): Promise<Date[]> {
  const response = await fetch(
    `/api/merchello/checkout/${basketId}/shipping/${providerKey}/${serviceCode}/dates`
  );
  return response.json();
}

async function selectShippingOption(basketId: string, providerKey: string, serviceCode: string, deliveryDate?: string) {
  await fetch(`/api/merchello/checkout/${basketId}/shipping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerKey,
      serviceCode,
      requestedDeliveryDate: deliveryDate
    })
  });
}
```

---

## Testing Provider Configuration

The backoffice includes a **Test** button for configured shipping providers. This allows users to verify their API credentials and validate configured service types.

### How Testing Works

1. User clicks **Test** on a configured provider
2. Enters test destination (country, postal code) and package details
3. System fetches all configured `ShippingOption` records for that provider
4. Calls `GetRatesAsync()` to fetch all available rates from the carrier API
5. Compares returned service types against configured service types
6. Shows results grouped into:
   - **Configured Service Types**: Shows ✓ for valid (rate returned) or ✗ for invalid (no rate)
   - **Other Available Services**: Additional services returned by API that aren't configured

### Service Type Extraction

The test endpoint reads service types from the concrete `ServiceType` property on `ShippingServiceLevel`:

```csharp
// In GetRatesAsync(), set the ServiceType property:
return new ShippingServiceLevel
{
    ServiceCode = $"fedex-{rate.ServiceType.ToLower()}",
    ServiceName = serviceType?.DisplayName ?? rate.ServiceName,
    TotalCost = rate.TotalCharge,
    ServiceType = ServiceTypeLookup.GetValueOrDefault(rate.ServiceType)
               ?? new ShippingServiceType
               {
                   Code = rate.ServiceType,
                   DisplayName = rate.ServiceName,
                   ProviderKey = Metadata.Key
               }
};
```

### Why This Matters

- Users can verify their carrier API credentials are working
- Invalid service types (removed by carrier, misspelled, etc.) are immediately visible
- Helps troubleshoot "why isn't this service showing?" issues
- Validates that per-warehouse service configurations are correct

---

## TransitTime, ShippingServiceCategory, and 3PL Fulfilment Routing

`ShippingServiceLevel.TransitTime` is used by the fulfilment system to determine the correct 3PL shipping method. When a store uses a 3PL (ShipBob, ShipMonk, etc.), the system infers a `ShippingServiceCategory` speed tier from transit time data:

```csharp
public enum ShippingServiceCategory
{
    Standard = 0,    // Ground/standard (4-7 business days)
    Economy = 10,    // Budget/slow (8+ business days)
    Express = 20,    // 2-3 day express
    Overnight = 30   // Next business day
}
```

| TransitTime (days) | ShippingServiceCategory | Typical 3PL Method |
|---------------------|------------------------|-------------------|
| ≤ 1 | `Overnight` | "Overnight", "Next Day" |
| 2-3 | `Express` | "2-Day", "Expedited" |
| 4-7 | `Standard` | "Ground", "Standard" |
| 8+ | `Economy` | "Economy", "Standard" |
| Not set (null) | null | DefaultShippingMethod fallback |

**Providers should always set `TransitTime`** on `ShippingServiceLevel` when the carrier API returns transit data. This enables correct 3PL routing without hardcoding carrier-specific service codes.

```csharp
// In GetRatesAsync - always populate TransitTime from carrier response
return new ShippingServiceLevel
{
    ServiceCode = $"fedex-{rate.ServiceType.ToLowerInvariant()}",
    ServiceName = serviceType?.DisplayName ?? rate.ServiceName,
    TotalCost = totalCost,
    TransitTime = TimeSpan.FromDays(rate.TransitDays),  // Critical for 3PL routing
    // ...
};
```

If a carrier API doesn't return transit time, the fulfilment system falls through to `DefaultShippingMethod` configured on the fulfilment provider.

---

## Notes

- Sensitive config values (API keys) should be encrypted at rest
- Consider caching carrier API responses (rates cached 10 mins by default)
- Use an `environment` configuration field (stored in `SettingsJson`) to switch between sandbox/production
- Providers auto-discovered via assembly scanning - no DI registration needed
- Return `null` from `GetRatesAsync` if provider cannot service the request
- External providers **must** implement `GetSupportedServiceTypesAsync` to declare available service types
- Set `ServiceType` property on `ShippingServiceLevel` for proper filtering - don't use magic strings in `ExtendedProperties`
- Use `ExtendedProperties` only for truly optional metadata (tracking URL templates, etc.)
- Weight should be in kilograms, dimensions in centimeters
- Always check `IsAvailableFor` before making expensive API calls
- Override `GetRatesForServicesAsync` for efficient per-service filtering with markup support (non-dynamic providers)
- **Dynamic providers** (`UsesLiveRates = true`): override `GetRatesForAllServicesAsync` and `GetAvailableServicesAsync` instead of `GetRatesForServicesAsync`
- **Dynamic providers** use `WarehouseProviderConfig` for per-warehouse markup/exclusions, not individual `ShippingOption` records
- **Dynamic providers** generate SelectionKeys in the format `dyn:{providerKey}:{serviceCode}` (e.g., `dyn:fedex:FEDEX_GROUND`)
- **Fallback rates**: Set `IsFallbackRate = true` and `FallbackReason` on `ShippingRateQuote` when returning cached rates due to carrier API failure
- **External providers must convert rates to request currency** using `IExchangeRateCache` and `ICurrencyService` (see "Currency Conversion for External Providers" section)
- **Rates are assumed tax-exclusive by default** - if your provider returns tax-inclusive rates, set `RatesIncludeTax = true` in metadata (see "Tax Handling for Shipping Rates" section)
- **Always populate `TransitTime`** on `ShippingServiceLevel` when carrier API provides transit data - this enables automatic `ShippingServiceCategory` inference for 3PL speed-tier routing















