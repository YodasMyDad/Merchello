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
    public bool UsesLiveRates { get; init; }          // Rates from API, not config
    public bool RequiresGlobalConfig { get; init; }   // Needs API credentials first
}
```

| Provider Type | HasLocationBasedCosts | HasWeightTiers | UsesLiveRates | RequiresGlobalConfig |
|---------------|----------------------|----------------|---------------|----------------------|
| Flat Rate | true | true | false | false |
| UPS/FedEx | false | false | true | true |
| Free Shipping | false | false | false | false |

## Two Types of Configuration

Providers can have two types of configuration:

1. **Global Configuration** (`GetConfigurationFieldsAsync`)
   - API credentials, account numbers, environment selection
   - Stored in `merchelloShippingProviderConfigurations` table
   - Required before provider can be used (if `RequiresGlobalConfig = true`)

2. **Per-Method Configuration** (`GetMethodConfigFieldsAsync`)
   - Method name, delivery days, markup percentage
   - Stored in `ShippingOption.ProviderSettings` as JSON
   - Each warehouse can have multiple methods from same provider
   - Service type selection is handled via `GetSupportedServiceTypesAsync`

---

## Service Types Model

External providers must declare their supported service types via `GetSupportedServiceTypesAsync`. This provides:

- **Type Safety**: No magic strings - service types are concrete models
- **DRY**: Display names defined once, not duplicated in code
- **UI Generation**: Dropdowns auto-generated from provider metadata

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

## GetRatesForServicesAsync

External providers (FedEx, UPS, etc.) should implement `GetRatesForServicesAsync` to support per-warehouse service filtering:

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

## Example 1: FedEx (Real-Time Rates)

```csharp
public class FedExShippingProvider : ShippingProviderBase
{
    private string? _accountNumber;
    private string? _apiKey;
    private string? _secretKey;
    private bool _useProduction;

    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "fedex",
        DisplayName = "FedEx",
        Icon = "icon-truck",
        Description = "Real-time FedEx shipping rates",
        SupportsRealTimeRates = true,
        SupportsTracking = true,
        SupportsLabelGeneration = true,
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
        new ShippingServiceType { Code = "STANDARD_OVERNIGHT", DisplayName = "FedEx Standard Overnight", ProviderKey = "fedex" },
        new ShippingServiceType { Code = "PRIORITY_OVERNIGHT", DisplayName = "FedEx Priority Overnight", ProviderKey = "fedex" }
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

    // GLOBAL CONFIG: API credentials
    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new() { Key = "accountNumber", Label = "Account Number", FieldType = ConfigurationFieldType.Text, IsRequired = true },
            new() { Key = "apiKey", Label = "API Key", FieldType = ConfigurationFieldType.Password, IsSensitive = true, IsRequired = true },
            new() { Key = "secretKey", Label = "Secret Key", FieldType = ConfigurationFieldType.Password, IsSensitive = true, IsRequired = true },
            new() { Key = "environment", Label = "Environment", FieldType = ConfigurationFieldType.Select, IsRequired = true,
                    Options = [new("sandbox", "Sandbox"), new("production", "Production")] }
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
                    Description = "Percentage to add to FedEx rates" }
        ]);
    }

    public override ValueTask ConfigureAsync(ShippingProviderConfiguration? config, CancellationToken ct = default)
    {
        if (config?.SettingsJson != null)
        {
            var settings = JsonSerializer.Deserialize<Dictionary<string, string>>(config.SettingsJson);
            _accountNumber = settings?.GetValueOrDefault("accountNumber");
            _apiKey = settings?.GetValueOrDefault("apiKey");
            _secretKey = settings?.GetValueOrDefault("secretKey");
        }
        _useProduction = !(config?.IsTestMode ?? true);
        return ValueTask.CompletedTask;
    }

    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        if (request.IsEstimateMode) return false;
        return request.Items.Any(i => i.IsShippable && i.TotalWeightKg > 0);
    }

    public override async Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request, CancellationToken ct = default)
    {
        if (!IsAvailableFor(request)) return null;

        var response = await _fedexClient.GetRatesAsync(/* ... */, ct);

        var serviceLevels = response.Rates.Select(rate =>
        {
            // Resolve concrete service type from lookup
            var serviceType = ServiceTypeLookup.GetValueOrDefault(rate.ServiceType);

            return new ShippingServiceLevel
            {
                ServiceCode = $"fedex-{rate.ServiceType.ToLower()}",
                ServiceName = serviceType?.DisplayName ?? rate.ServiceName,
                TotalCost = rate.TotalCharge,
                CurrencyCode = rate.Currency,
                TransitTime = TimeSpan.FromDays(rate.TransitDays),
                EstimatedDeliveryDate = rate.DeliveryDate,
                // Set the concrete ServiceType property
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
        if (!IsAvailableFor(request)) return null;

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
                var adjustedCost = sl.TotalCost * (1 + markup / 100);

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

    private static decimal GetMarkupFromSettings(string? providerSettingsJson)
    {
        if (string.IsNullOrEmpty(providerSettingsJson)) return 0;
        var settings = JsonSerializer.Deserialize<Dictionary<string, string>>(providerSettingsJson);
        return decimal.TryParse(settings?.GetValueOrDefault("markup"), out var m) ? m : 0;
    }
}
```

---

## Example 2: UPS (with Tracking)

```csharp
public class UpsShippingProvider : ShippingProviderBase
{
    private string? _accessKey;
    private string? _userId;
    private string? _password;

    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "ups",
        DisplayName = "UPS",
        Icon = "icon-truck",
        Description = "UPS shipping rates with tracking support",
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

    // Define supported service types
    private static readonly IReadOnlyList<ShippingServiceType> SupportedServiceTypes =
    [
        new ShippingServiceType { Code = "03", DisplayName = "UPS Ground", ProviderKey = "ups" },
        new ShippingServiceType { Code = "02", DisplayName = "UPS 2nd Day Air", ProviderKey = "ups" },
        new ShippingServiceType { Code = "01", DisplayName = "UPS Next Day Air", ProviderKey = "ups" },
        new ShippingServiceType { Code = "14", DisplayName = "UPS Next Day Air Early", ProviderKey = "ups" }
    ];

    private static readonly Dictionary<string, ShippingServiceType> ServiceTypeLookup =
        SupportedServiceTypes.ToDictionary(st => st.Code, StringComparer.OrdinalIgnoreCase);

    public override ValueTask<IReadOnlyList<ShippingServiceType>> GetSupportedServiceTypesAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult(SupportedServiceTypes);
    }

    // Global config: API credentials
    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new() { Key = "accessKey", Label = "Access Key", FieldType = ConfigurationFieldType.Password, IsSensitive = true, IsRequired = true },
            new() { Key = "userId", Label = "User ID", FieldType = ConfigurationFieldType.Text, IsRequired = true },
            new() { Key = "password", Label = "Password", FieldType = ConfigurationFieldType.Password, IsSensitive = true, IsRequired = true },
            new() { Key = "accountNumber", Label = "Account Number", FieldType = ConfigurationFieldType.Text, IsRequired = true }
        ]);
    }

    // Per-method config: markup (service type selection handled by GetSupportedServiceTypesAsync)
    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetMethodConfigFieldsAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new() { Key = "name", Label = "Display Name", FieldType = ConfigurationFieldType.Text, IsRequired = false },
            new() { Key = "markup", Label = "Markup %", FieldType = ConfigurationFieldType.Percentage }
        ]);
    }

    public override ValueTask ConfigureAsync(ShippingProviderConfiguration? config, CancellationToken ct = default)
    {
        if (config?.SettingsJson != null)
        {
            var settings = JsonSerializer.Deserialize<Dictionary<string, string>>(config.SettingsJson);
            _accessKey = settings?.GetValueOrDefault("accessKey");
            _userId = settings?.GetValueOrDefault("userId");
            _password = settings?.GetValueOrDefault("password");
        }
        return ValueTask.CompletedTask;
    }

    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        return !request.IsEstimateMode && request.Items.Any(i => i.IsShippable);
    }

    public override async Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request, CancellationToken ct = default)
    {
        if (!IsAvailableFor(request)) return null;

        var rates = await _upsClient.GetRatesAsync(/* ... */);

        return new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels = rates.Select(r =>
            {
                var serviceType = ServiceTypeLookup.GetValueOrDefault(r.ServiceCode);
                return new ShippingServiceLevel
                {
                    ServiceCode = $"ups-{r.ServiceCode}",
                    ServiceName = serviceType?.DisplayName ?? r.ServiceDescription,
                    TotalCost = r.TotalCharges,
                    CurrencyCode = r.CurrencyCode,
                    EstimatedDeliveryDate = r.GuaranteedDeliveryDate,
                    ServiceType = serviceType ?? new ShippingServiceType
                    {
                        Code = r.ServiceCode,
                        DisplayName = r.ServiceDescription,
                        ProviderKey = Metadata.Key
                    },
                    ExtendedProperties = new Dictionary<string, string>
                    {
                        ["trackingUrlTemplate"] = "https://www.ups.com/track?tracknum={trackingNumber}"
                    }
                };
            }).ToList()
        };
    }
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

## Notes

- Sensitive config values (API keys) should be encrypted at rest
- Consider caching carrier API responses (rates cached 10 mins by default)
- Use `IsTestMode` from configuration to switch between sandbox/production
- Providers auto-discovered via assembly scanning - no DI registration needed
- Return `null` from `GetRatesAsync` if provider cannot service the request
- External providers **must** implement `GetSupportedServiceTypesAsync` to declare available service types
- Set `ServiceType` property on `ShippingServiceLevel` for proper filtering - don't use magic strings in `ExtendedProperties`
- Use `ExtendedProperties` only for truly optional metadata (tracking URL templates, etc.)
- Weight should be in kilograms, dimensions in centimeters
- Always check `IsAvailableFor` before making expensive API calls
- Override `GetRatesForServicesAsync` for efficient per-service filtering with markup support
- **External providers must convert rates to request currency** using `IExchangeRateCache` and `ICurrencyService` (see "Currency Conversion for External Providers" section)
- **Rates are assumed tax-exclusive by default** - if your provider returns tax-inclusive rates, set `RatesIncludeTax = true` in metadata (see "Tax Handling for Shipping Rates" section)



















