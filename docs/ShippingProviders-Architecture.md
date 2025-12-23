# Shipping Provider System - Architecture

## Overview

Pluggable shipping provider system with built-in carriers (Flat Rate, FedEx, UPS) and support for third-party providers as NuGet packages. All providers are auto-discovered and configurable via backoffice.

## Architecture

| Layer | Components |
|-------|------------|
| **Providers** | `IShippingProvider` implementations (NuGet packages) |
| **Manager** | `ShippingProviderManager` - discovery via `ExtensionManager`, config loading, lifecycle |
| **Quote Service** | `ShippingQuoteService` - orchestrates rate requests, caching |
| **Storage** | `merchelloShippingProviderConfigurations` (config), `ShippingOption`/`ShippingCost` (rates) |

## Key Interfaces

| Interface/Class | Location |
|-----------------|----------|
| `IShippingProvider` | [IShippingProvider.cs](../src/Merchello.Core/Shipping/Providers/IShippingProvider.cs) |
| `ShippingProviderBase` | [ShippingProviderBase.cs](../src/Merchello.Core/Shipping/Providers/ShippingProviderBase.cs) |
| `ShippingProviderMetadata` | [ShippingProviderMetadata.cs](../src/Merchello.Core/Shipping/Providers/ShippingProviderMetadata.cs) |
| `ProviderConfigCapabilities` | [ProviderConfigCapabilities.cs](../src/Merchello.Core/Shipping/Providers/ProviderConfigCapabilities.cs) |
| `IShippingProviderManager` | [IShippingProviderManager.cs](../src/Merchello.Core/Shipping/Providers/IShippingProviderManager.cs) |
| `ShippingProviderManager` | [ShippingProviderManager.cs](../src/Merchello.Core/Shipping/Providers/ShippingProviderManager.cs) |
| `IShippingQuoteService` | [IShippingQuoteService.cs](../src/Merchello.Core/Shipping/Services/Interfaces/IShippingQuoteService.cs) |
| `ShippingQuoteService` | [ShippingQuoteService.cs](../src/Merchello.Core/Shipping/Services/ShippingQuoteService.cs) |

## Key Models

| Model | Location |
|-------|----------|
| `ShippingQuoteRequest` | [ShippingQuoteRequest.cs](../src/Merchello.Core/Shipping/Providers/ShippingQuoteRequest.cs) |
| `ShippingRateQuote` | [ShippingRateQuote.cs](../src/Merchello.Core/Shipping/Providers/ShippingRateQuote.cs) |
| `ShippingServiceLevel` | [ShippingServiceLevel.cs](../src/Merchello.Core/Shipping/Providers/ShippingServiceLevel.cs) |
| `ShippingQuoteItem` | [ShippingQuoteItem.cs](../src/Merchello.Core/Shipping/Providers/ShippingQuoteItem.cs) |
| `ShipmentPackage` | [ShipmentPackage.cs](../src/Merchello.Core/Shipping/Providers/ShipmentPackage.cs) |
| `ShippingProviderConfiguration` | [ShippingProviderConfiguration.cs](../src/Merchello.Core/Shipping/Models/ShippingProviderConfiguration.cs) |

## Design Decisions

### Provider Discovery
- Uses `ExtensionManager` for assembly scanning (same pattern as `IPaymentProvider`)
- Providers define immutable `Key` in metadata
- Auto-discovered - no manual DI registration needed

### Configuration Storage
- Settings (API keys, account numbers) stored as JSON in `SettingsJson` column
- Each provider defines fields via `GetConfigurationFieldsAsync()`
- Sensitive fields (API keys) should be encrypted at rest

### Rate Caching
- Quotes cached via `CacheService` with 10-minute TTL
- Cache key built from basket contents + destination
- Cache cleared when basket changes

### Estimate vs Full Address Mode
- `IsEstimateMode` flag indicates minimal address info (country/postal only)
- Providers with `RequiresFullAddress = true` can skip or return estimates
- Enables cart-page shipping estimates before full checkout

### Currency Conversion (External Providers)
- External carrier APIs (FedEx, UPS, DHL) return rates in the carrier account's currency
- **All external providers MUST convert rates** to `request.CurrencyCode` (basket currency)
- Uses `IExchangeRateCache` for exchange rates and `ICurrencyService` for currency-aware rounding
- If no exchange rate available, return error message (don't fail silently)
- See [ShippingProviders-DevGuide.md](./ShippingProviders-DevGuide.md#currency-conversion-for-external-providers) for implementation pattern

## Provider Capabilities

| Capability | Description |
|------------|-------------|
| `SupportsRealTimeRates` | Fetches live rates from external API |
| `SupportsTracking` | Can provide tracking URLs for shipments |
| `SupportsLabelGeneration` | Can generate shipping labels |
| `SupportsDeliveryDateSelection` | Allows customers to pick delivery date |
| `SupportsInternational` | Handles international shipments |
| `RequiresFullAddress` | Needs complete address for quotes (vs just country/postal) |
| `SupportedCountries` | List of countries provider operates in (null = all) |

## Provider Configuration Capabilities

The `ConfigCapabilities` property on `ShippingProviderMetadata` controls which UI elements are shown when configuring shipping methods:

| Capability | Description | UI Impact |
|------------|-------------|-----------|
| `HasLocationBasedCosts` | Uses location-based cost tables | Shows ShippingCosts table editor |
| `HasWeightTiers` | Uses weight tier surcharge tables | Shows WeightTiers table editor |
| `UsesLiveRates` | Fetches rates from external API at runtime | Hides cost tables, shows "Live rates" |
| `RequiresGlobalConfig` | Requires API credentials before use | Provider must be configured first |

```csharp
public record ProviderConfigCapabilities
{
    public bool HasLocationBasedCosts { get; init; }  // FlatRate: true, UPS: false
    public bool HasWeightTiers { get; init; }         // FlatRate: true, UPS: false
    public bool UsesLiveRates { get; init; }          // FlatRate: false, UPS: true
    public bool RequiresGlobalConfig { get; init; }   // FlatRate: false, UPS: true
}
```

## ShippingOption-Provider Linkage

Each `ShippingOption` (per-warehouse shipping method) is linked to a provider via `ProviderKey` and optionally `ServiceType`:

```csharp
public class ShippingOption
{
    // Core fields
    public string Name { get; set; }
    public Guid WarehouseId { get; set; }
    public decimal? FixedCost { get; set; }

    // Provider linkage
    public string ProviderKey { get; set; } = "flat-rate";  // e.g., "flat-rate", "ups", "fedex"
    public string? ServiceType { get; set; }                 // e.g., "FEDEX_GROUND", "FEDEX_2_DAY"
    public string? ProviderSettings { get; set; }            // JSON for per-method config (e.g., markup)
    public bool IsEnabled { get; set; } = true;
}
```

### ServiceType Field

The `ServiceType` field identifies which carrier service this shipping method represents:

| Provider | ServiceType Examples | Purpose |
|----------|---------------------|---------|
| **flat-rate** | `null` | Flat rate uses Costs/WeightTiers tables, no service type needed |
| **fedex** | `FEDEX_GROUND`, `FEDEX_2_DAY`, `PRIORITY_OVERNIGHT` | Maps to FedEx API service codes |
| **ups** | `03` (Ground), `02` (2nd Day), `01` (Next Day) | Maps to UPS service codes |

### How ServiceType Enables Per-Warehouse Control

1. **Admin creates ShippingOption** with ProviderKey=`fedex`, ServiceType=`FEDEX_GROUND`
2. **Quote request** for that warehouse collects all enabled ShippingOptions
3. **ShippingQuoteService** groups by ProviderKey and calls `GetRatesForServicesAsync` with the service types
4. **FedExShippingProvider** fetches rates from API, filters to only the requested services, applies markup

This ensures:
- Only warehouse-enabled services are returned (not all FedEx services)
- Product-level restrictions (`AllowedShippingOptions`/`ExcludedShippingOptions`) work for all providers
- Different warehouses can offer different service levels from the same carrier

### Provider Configuration Flow

1. **Global Config** (optional): Some providers need API credentials first
   - Stored in `merchelloShippingProviderConfigurations` table
   - Configured via Providers section in UI

2. **Per-Warehouse Methods**: Each warehouse configures shipping methods
   - Stored in `merchelloShippingOptions` table with `ProviderKey`
   - Provider determines which fields to show

3. **Method Config Fields**: Providers define fields via `GetMethodConfigFieldsAsync()`
   - Rendered as dynamic form in UI
   - Separate from global config (`GetConfigurationFieldsAsync()`)

## Quote Flow

```
1. ShippingQuoteService.GetQuotesAsync(basket, countryCode, stateCode)
       │
       ▼
2. BuildRequestAsync() → ShippingQuoteRequest
       │ - Loads products with shipping options (includes ServiceType)
       │ - Builds ShippingQuoteItem per line item
       │ - For each product: calls GetEffectivePackages() to get package configs
       │ - Creates ShipmentPackage[] (one per package × quantity ordered)
       ▼
3. Check Cache (key: basket + destination + product quantities)
       │
       ├── Cache Hit → Return cached quotes
       │
       └── Cache Miss ↓
                      ▼
4. FetchQuotesFromProvidersAsync()
       │ - Get enabled ShippingOptions for warehouse
       │ - Group ShippingOptions by ProviderKey
       │ - For each provider:
       │     - Get serviceTypes from that provider's ShippingOptions
       │     - Check IsAvailableFor(request)
       │     - If provider.UsesLiveRates && serviceTypes.Any():
       │         Call GetRatesForServicesAsync(request, serviceTypes, options)
       │     - Else:
       │         Call GetRatesAsync(request)
       ▼
5. Return List<ShippingRateQuote> (cached for 10 min)
```

### GetRatesForServicesAsync vs GetRatesAsync

| Method | When Used | Purpose |
|--------|-----------|---------|
| `GetRatesAsync` | Flat-rate providers | Returns all configured rates |
| `GetRatesForServicesAsync` | External providers (FedEx, UPS) | Fetches rates filtered to only enabled service types |

### Package Resolution

Products can ship in multiple packages. The `ShippingQuoteService` resolves packages via `GetEffectivePackages()`:

```
ProductRoot.DefaultPackageConfigurations ─────┐
                                              ├──► GetEffectivePackages(Product)
Product.PackageConfigurations ────────────────┘
       │
       ▼ (returns)
If Product.PackageConfigurations.Any() → variant packages
Else → ProductRoot.DefaultPackageConfigurations
       │
       ▼ (for each package × quantity)
ShipmentPackage[] in ShippingQuoteRequest.Packages
```

**Example**: Customer orders 2x T-Shirt (variant ships in 2 boxes each)
- GetEffectivePackages returns 2 ProductPackage configs
- 2 items × 2 packages = 4 ShipmentPackage entries sent to provider
- Provider calculates rates based on all package dimensions/weights

The `GetRatesForServicesAsync` method receives:
- `serviceTypes`: List of service codes to fetch (e.g., `["FEDEX_GROUND", "FEDEX_2_DAY"]`)
- `shippingOptions`: The ShippingOption records containing per-method settings (markup, etc.)

Providers can implement this efficiently by:
1. Filtering at the API level (pass service types to carrier API if supported)
2. Or filtering responses after fetching (default `ShippingProviderBase` implementation)

## Service Level Structure

Each provider returns a `ShippingRateQuote` containing service levels:

```csharp
public class ShippingServiceLevel
{
    public string ServiceCode { get; init; }      // e.g., "fedex-ground", "ups-next-day"
    public string ServiceName { get; init; }      // e.g., "FedEx Ground", "UPS Next Day Air"
    public decimal TotalCost { get; init; }       // Shipping cost
    public string CurrencyCode { get; init; }     // e.g., "USD", "GBP"
    public TimeSpan? TransitTime { get; init; }   // Estimated transit duration
    public DateTime? EstimatedDeliveryDate { get; init; }
    public string? Description { get; init; }
    public IDictionary<string, string>? ExtendedProperties { get; init; }
}
```

## Delivery Date Selection

For providers supporting delivery date selection:

```csharp
// Get available dates for a service level
Task<List<DateTime>> GetAvailableDeliveryDatesAsync(
    ShippingQuoteRequest request,
    ShippingServiceLevel serviceLevel,
    CancellationToken ct);

// Calculate surcharge for specific date (e.g., Saturday delivery)
Task<decimal> CalculateDeliveryDateSurchargeAsync(
    ShippingQuoteRequest request,
    ShippingServiceLevel serviceLevel,
    DateTime requestedDate,
    CancellationToken ct);

// Validate date is still available before order creation
Task<bool> ValidateDeliveryDateAsync(
    ShippingQuoteRequest request,
    ShippingServiceLevel serviceLevel,
    DateTime requestedDate,
    CancellationToken ct);
```

## Database Schema

**merchelloShippingProviderConfigurations**
- `Id` (Guid) - Primary key
- `ProviderKey` (string, unique) - Matches provider metadata key
- `DisplayName` (string) - Custom display name
- `IsEnabled` (bool) - Whether provider is active
- `SettingsJson` (string) - JSON configuration values
- `SortOrder` (int) - Display order
- `CreateDate`, `UpdateDate` (DateTime)

> **Note:** Unlike payment providers, shipping providers do not have an `IsTestMode` field. This is because most shipping providers (like Flat Rate) don't have a concept of "test mode". Third-party providers that need sandbox/test credentials can implement this as a provider-specific configuration field.

## File Structure

```
src/Merchello.Core/Shipping/
├── Providers/
│   ├── BuiltIn/
│   │   └── FlatRateShippingProvider.cs
│   ├── FedEx/                              # Built-in FedEx provider
│   │   ├── FedExShippingProvider.cs
│   │   ├── FedExApiClient.cs
│   │   └── Models/
│   ├── UPS/                                # Built-in UPS provider
│   │   ├── UpsShippingProvider.cs
│   │   ├── UpsApiClient.cs
│   │   └── Models/
│   ├── IShippingProvider.cs
│   ├── IShippingProviderManager.cs
│   ├── ShippingProviderBase.cs
│   ├── ShippingProviderManager.cs
│   ├── ShippingProviderMetadata.cs
│   ├── ProviderConfigCapabilities.cs           # NEW: Config capability flags
│   ├── ShippingProviderConfigurationField.cs
│   ├── ConfigurationFieldType.cs               # Updated: +Number, Currency, Percentage
│   ├── SelectOption.cs
│   ├── RegisteredShippingProvider.cs
│   ├── ShippingQuoteRequest.cs
│   ├── ShippingQuoteItem.cs
│   ├── ShippingRateQuote.cs
│   ├── ShippingServiceLevel.cs
│   ├── ShipmentPackage.cs
│   ├── ShippingProductSnapshot.cs
│   ├── ShippingOptionSnapshot.cs
│   ├── ShippingCostSnapshot.cs
│   └── ShippingWeightTierSnapshot.cs           # NEW: Weight tier for quote context
├── Models/
│   ├── ShippingProviderConfiguration.cs
│   ├── ShippingOption.cs                       # +ProviderKey, ServiceType, ProviderSettings, IsEnabled
│   ├── ShippingCost.cs
│   ├── ShippingWeightTier.cs
│   ├── ShippingOptionCountry.cs
│   ├── Shipment.cs
│   └── ...
├── Services/
│   ├── Interfaces/
│   │   ├── IShippingService.cs
│   │   ├── IShippingQuoteService.cs
│   │   └── IShippingOptionService.cs
│   ├── ShippingService.cs
│   ├── ShippingQuoteService.cs
│   └── ShippingOptionService.cs
├── Mapping/
│   ├── ShippingProviderConfigurationDbMapping.cs
│   ├── ShippingOptionDbMapping.cs
│   └── ShippingWeightTierDbMapping.cs
└── Dtos/
    ├── ShippingProviderDto.cs                  # Updated: +ProviderConfigCapabilitiesDto, etc.
    ├── ShippingProviderConfigurationDto.cs
    ├── ShippingOptionDtos.cs                   # Updated: +ProviderKey, ProviderSettings fields
    └── ...

src/Merchello/Controllers/
├── ShippingProvidersApiController.cs           # Updated: +method-config, available-for-warehouse
└── ShippingOptionsApiController.cs
```

## API Endpoints

### Provider Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/merchello/shipping-providers/available` | List all discovered providers |
| GET | `/api/merchello/shipping-providers` | List configured providers |
| GET | `/api/merchello/shipping-providers/{id}` | Get provider configuration |
| GET | `/api/merchello/shipping-providers/{key}/fields` | Get global configuration fields |
| GET | `/api/merchello/shipping-providers/{key}/method-config` | Get method config fields and capabilities |
| GET | `/api/merchello/shipping-providers/available-for-warehouse` | Get providers available for adding methods |
| POST | `/api/merchello/shipping-providers` | Create provider configuration |
| PUT | `/api/merchello/shipping-providers/{id}` | Update configuration |
| PUT | `/api/merchello/shipping-providers/{id}/toggle` | Enable/disable provider |
| PUT | `/api/merchello/shipping-providers/reorder` | Update sort order |
| DELETE | `/api/merchello/shipping-providers/{id}` | Delete configuration |

### Method Config Endpoint

The `/method-config` endpoint returns fields and capabilities for per-warehouse shipping method setup:

```json
{
  "providerKey": "flat-rate",
  "displayName": "Flat Rate Shipping",
  "fields": [
    { "key": "name", "label": "Method Name", "fieldType": "Text", "isRequired": true },
    { "key": "fixedCost", "label": "Fixed Cost", "fieldType": "Currency" },
    { "key": "daysFrom", "label": "Min Delivery Days", "fieldType": "Number" },
    { "key": "daysTo", "label": "Max Delivery Days", "fieldType": "Number" }
  ],
  "capabilities": {
    "hasLocationBasedCosts": true,
    "hasWeightTiers": true,
    "usesLiveRates": false,
    "requiresGlobalConfig": false
  }
}
```

### Available for Warehouse Endpoint

The `/available-for-warehouse` endpoint returns providers with availability status:

```json
[
  {
    "key": "flat-rate",
    "displayName": "Flat Rate Shipping",
    "isAvailable": true,
    "requiresSetup": false,
    "capabilities": { ... }
  },
  {
    "key": "ups",
    "displayName": "UPS",
    "isAvailable": false,
    "requiresSetup": true,  // Needs global config first
    "capabilities": { ... }
  }
]
```

## Testing Checklist

- [x] Provider discovery finds all `IShippingProvider` implementations
- [x] Provider configuration saves/loads correctly
- [x] Quote requests build correctly from basket
- [x] Rate caching works with correct TTL
- [x] Cache invalidates on basket changes
- [x] Provider enable/disable/ordering works
- [x] IsAvailableFor filtering works correctly
- [x] Estimate mode vs full address mode
- [ ] Delivery date selection flow
- [ ] Tracking URL generation
- [ ] Label generation (future)


