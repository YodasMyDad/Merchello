# Shipping Provider System - Architecture

## Overview

Pluggable shipping provider system allowing third-party carriers (FedEx, UPS, DHL, etc.) as NuGet packages, auto-discovered and configurable via backoffice.

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

Each `ShippingOption` (per-warehouse shipping method) is linked to a provider via `ProviderKey`:

```csharp
public class ShippingOption
{
    // Existing fields...
    public string Name { get; set; }
    public Guid WarehouseId { get; set; }
    public decimal? FixedCost { get; set; }

    // Provider linkage (new)
    public string ProviderKey { get; set; } = "flat-rate";  // e.g., "flat-rate", "ups", "fedex"
    public string? ProviderSettings { get; set; }            // JSON for provider-specific config
    public bool IsEnabled { get; set; } = true;
}
```

- **FlatRate**: Uses `Costs` and `WeightTiers` tables; `ProviderSettings` is typically null
- **UPS/FedEx**: Uses `ProviderSettings` JSON for service level, markup, etc.; no cost tables

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
       │ - Loads products with shipping options
       │ - Builds ShippingQuoteItem per line item
       │ - Creates ShipmentPackage with total weight
       ▼
3. Check Cache (key: basket + destination + product quantities)
       │
       ├── Cache Hit → Return cached quotes
       │
       └── Cache Miss ↓
                      ▼
4. FetchQuotesFromProvidersAsync()
       │ - Get enabled providers (ordered by SortOrder)
       │ - For each provider:
       │     - Check IsAvailableFor(request)
       │     - Call GetRatesAsync(request)
       ▼
5. Return List<ShippingRateQuote> (cached for 10 min)
```

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
│   ├── ShippingOption.cs                       # Updated: +ProviderKey, ProviderSettings, IsEnabled
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


