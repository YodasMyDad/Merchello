# Shipping Provider Development Guide

Last reviewed against code: 2026-02-20

This guide is the implementation contract for creating shipping providers in Merchello.
It is based on the current runtime code paths, not legacy docs.

## Purpose

Use this document when building:
- Built-in style providers in `src/Merchello.Core/Shipping/Providers/*`
- Third-party NuGet shipping providers discovered through `ExtensionManager`

Goals:
- Keep provider implementations architecture-safe
- Keep checkout, invoice creation, and fulfilment mapping consistent
- Avoid stale assumptions about storage, endpoint contracts, and method usage

## Current Built-In Providers

Built-in shipping providers in this repo:
- `flat-rate` (built-in)
- `fedex` (dynamic/live rates)
- `ups` (dynamic/live rates)

Clarification:
- There is no Avalara shipping provider in this codebase.
- Avalara exists as a tax provider (`src/Merchello.Core/Tax/Providers/BuiltIn/AvalaraTaxProvider.cs`).

## Runtime Flow (Actual Code Path)

### Checkout API flow

1. Client loads shipping groups:
- `GET /api/merchello/checkout/shipping-groups`
- Controller: `src/Merchello/Controllers/CheckoutApiController.cs`
- Method: `GetShippingGroups`

2. Controller delegates to order grouping:
- `checkoutService.GetOrderGroupsAsync(...)`
- Service: `src/Merchello.Core/Checkout/Services/CheckoutService.cs`

3. Grouping strategy builds options:
- Strategy: `src/Merchello.Core/Checkout/Strategies/DefaultOrderGroupingStrategy.cs`
- Flat-rate options are resolved first
- Dynamic provider rates are added by `PopulateDynamicProviderRatesAsync(...)`

4. Client submits shipping selection:
- `POST /api/merchello/checkout/shipping`
- Controller method: `SaveShippingSelections`
- Service method: `CheckoutService.SaveShippingSelectionsAsync(...)`

5. Selection and quoted costs are persisted in checkout session:
- `SelectedShippingOptions` (SelectionKey values)
- `QuotedShippingCosts`

### Quote retrieval internals

Two separate quote paths exist. Use the right provider method for each.

1. Basket-level quote path (`ShippingQuoteService.GetQuotesAsync`):
- File: `src/Merchello.Core/Shipping/Services/ShippingQuoteService.cs`
- For live-rate providers with configured service types from `ShippingOption` records, Merchello calls:
  - `GetRatesForServicesAsync(request, serviceTypes, shippingOptions, ...)`

2. Warehouse/group-level dynamic path (`ShippingQuoteService.GetQuotesForWarehouseAsync`):
- Used by default grouping strategy for dynamic rates per warehouse
- For `UsesLiveRates = true`, Merchello calls:
  - `GetRatesForAllServicesAsync(request, warehouseConfig, ...)`

## Architecture Boundaries

Required boundaries:
- Controllers orchestrate HTTP only
- Services own business logic and data access
- Providers implement carrier communication and quote translation
- Do not duplicate basket math or shipping tax logic in providers

Shipping source of truth services:
- Basket totals: `CheckoutService.CalculateBasketAsync()`
- Shipping quote retrieval: `IShippingQuoteService.GetQuotes*()`
- Shipping base cost fallback: `ShippingCostResolver.ResolveBaseCost()`

## SelectionKey Contract (Must Stay Stable)

Selection key format:
- Flat-rate option: `so:{guid}`
- Dynamic service: `dyn:{provider}:{serviceCode}`
- Legacy: plain GUID still parsed for backward compatibility

Source:
- `src/Merchello.Core/Shipping/Extensions/SelectionKeyExtensions.cs`

This key is parsed during invoice creation to determine whether selection is flat-rate or dynamic.

## Storage Model (Actual)

### Global provider configuration

Stored in:
- Table: `merchelloProviderConfigurations`
- Discriminator: `ProviderType = Shipping`

Mapping source:
- `src/Merchello.Core/Shared/Providers/ProviderConfigurationDbMapping.cs`

Type:
- `ShippingProviderConfiguration`

### Shipping options (flat-rate and service-type-driven setups)

Stored in:
- `merchelloShippingOptions`
- Related tables for costs/tiers (if used)

Holds:
- `ProviderKey`
- `ServiceType`
- `ProviderSettings` (JSON)

### Warehouse provider config (dynamic provider controls)

Stored in:
- `merchelloWarehouses.ProviderConfigsJson`

Model:
- `src/Merchello.Core/Shipping/Models/WarehouseProviderConfig.cs`

This is not a separate `merchelloWarehouseProviderConfigs` table.

## Provider Metadata and Capabilities

Primary metadata type:
- `ShippingProviderMetadata`
- File: `src/Merchello.Core/Shipping/Providers/ShippingProviderMetadata.cs`

Config capability type:
- `ProviderConfigCapabilities`
- File: `src/Merchello.Core/Shipping/Providers/ProviderConfigCapabilities.cs`

Important flag:
- `UsesLiveRates = true` means provider is treated as dynamic/live-rate

Typical dynamic provider capabilities:
- `HasLocationBasedCosts = false`
- `HasWeightTiers = false`
- `UsesLiveRates = true`
- `RequiresGlobalConfig = true`

## IShippingProvider Contract (When Each Method Is Used)

Interface:
- `src/Merchello.Core/Shipping/Providers/Interfaces/IShippingProvider.cs`

Methods:

1. `GetConfigurationFieldsAsync`
- Global provider credentials/settings UI

2. `GetMethodConfigFieldsAsync`
- Per-shipping-method config fields (saved in `ShippingOption.ProviderSettings`)

3. `GetSupportedServiceTypesAsync`
- Canonical service catalog for provider (used by UI and filtering)

4. `ConfigureAsync`
- Apply persisted `ShippingProviderConfiguration`

5. `IsAvailableFor`
- Fast availability guard for a quote request

6. `GetRatesAsync`
- Base quote retrieval

7. `GetRatesForServicesAsync`
- Filtered live-rate retrieval using configured service types
- Used in basket-level quote flow when provider options define `ServiceType`

8. `GetAvailableServicesAsync`
- Optional route-level service discovery

9. `GetRatesForAllServicesAsync`
- Dynamic warehouse quote flow with `WarehouseProviderConfig` exclusions/markup

10. Delivery-date methods
- Optional; default implementation is no-op behavior

## Flat-Rate vs Dynamic Provider Behavior

### Flat-rate style

Data source:
- `ShippingOption` + `ShippingCost`/tiers

Main methods used:
- `GetRatesAsync`

### Dynamic/live-rate style

Data source:
- Carrier API live quotes
- `WarehouseProviderConfig` for markup/exclusions/day overrides

Main methods used:
- `GetRatesForServicesAsync` in basket-level filtered flow
- `GetRatesForAllServicesAsync` in warehouse-group dynamic flow

Important gate:
- `ProductRoot.AllowExternalCarrierShipping = false` blocks dynamic carrier options for those products/groups
- Enforced in `DefaultOrderGroupingStrategy`

## Dynamic Shipping -> Fulfilment Mapping (Critical)

This is the chain that must continue to work:

1. Provider returns `ShippingServiceLevel.TransitTime`
- In FedEx/UPS providers, parsed from carrier response

2. Grouping strategy maps transit time to shipping option window:
- `ShippingOptionInfo.DaysFrom`
- `ShippingOptionInfo.DaysTo`
- `ShippingOptionInfo.IsNextDay`
- File: `src/Merchello.Core/Checkout/Strategies/DefaultOrderGroupingStrategy.cs`
- Optional overrides from `WarehouseProviderConfig.DefaultDaysFromOverride/DefaultDaysToOverride`

3. Invoice creation infers category from days:
- `InvoiceService.InferServiceCategory(...)`
- Categories: Overnight / Express / Standard / Economy
- File: `src/Merchello.Core/Accounting/Services/InvoiceService.cs`

4. Fulfilment resolves final service code:
- `FulfilmentService.ResolveShippingServiceCode(order, settingsJson)`
- Resolution order:
  1. `ServiceCategoryMapping_{Category}`
  2. `DefaultShippingMethod`
  3. `Order.ShippingServiceCode` (raw fallback)
- File: `src/Merchello.Core/Fulfilment/Services/FulfilmentService.cs`

If transit time is omitted or not mapped, fulfilment falls back to less precise mapping.

## FedEx Provider Reference Implementation

Reference files:
- `src/Merchello.Core/Shipping/Providers/FedEx/FedExShippingProvider.cs`
- `src/Merchello.Core/Shipping/Providers/FedEx/FedExApiClient.cs`
- `src/Merchello.Core/Shipping/Providers/FedEx/Models/*`

What this implementation demonstrates:
- Metadata + capability declarations
- Global credential config fields
- OAuth grant-type support (`client_credentials`, `csp_credentials`, `client_pc_credentials`) with optional child credentials
- OAuth token lifecycle with refresh and thread-safe lock
- Carrier request building from warehouse origin + destination + package list
- Currency conversion to request/basket currency via:
  - `IExchangeRateCache`
  - `ICurrencyService.Round(...)`
- Mapping carrier service codes to `ShippingServiceType`
- Transit/estimated-delivery mapping to `ShippingServiceLevel`
- Dynamic all-services flow with `WarehouseProviderConfig` exclusions/markup

Recommended reference status:
- FedEx is the best current in-repo example for live-rate provider structure.

## FedEx API Freshness Check (Official Sources)

Checked on 2026-02-20 against FedEx Developer Portal:

1. Authorization API docs:
- Endpoint shown: `POST /oauth/token`
- Docs include grant-type variations (`client_credentials`, `csp_credentials`, `client_pc_credentials`)

2. Rate API catalog and docs:
- `rate/v1` docs and changelog are active
- Changelog entries include 2025 updates

3. SDK posture:
- FedEx developer materials emphasize REST APIs and collections
- No official FedEx .NET SDK is referenced in the checked official pages
- Current Merchello approach (direct REST client) is the correct integration pattern

Implementation note:
- Merchello FedEx request now includes `returnTransitTimes = true` so day-window/fulfilment mapping has reliable transit metadata.
- Merchello FedEx config now supports optional `grantType`, `childKey`, and `childSecret` for advanced FedEx auth flows.

## UPS Provider Notes

Files:
- `src/Merchello.Core/Shipping/Providers/UPS/UpsShippingProvider.cs`
- `src/Merchello.Core/Shipping/Providers/UPS/UpsApiClient.cs`

UPS follows the same dynamic pattern as FedEx:
- OAuth + live quote retrieval
- Service-level mapping
- Dynamic warehouse config application

## Required Implementation Checklist for New Providers

1. Implement provider class inheriting `ShippingProviderBase`
2. Set stable `Metadata.Key`
3. Declare accurate `ConfigCapabilities`
4. Implement `GetSupportedServiceTypesAsync`
5. Implement `ConfigureAsync` for global settings
6. Implement `IsAvailableFor` guard
7. Implement `GetRatesAsync` with robust error handling
8. Implement `GetRatesForServicesAsync` for service-type filtering + method-level markup
9. Implement `GetRatesForAllServicesAsync` for dynamic warehouse flow
10. Populate `ShippingServiceLevel` fields:
- `ServiceCode`
- `ServiceName`
- `TotalCost`
- `CurrencyCode`
- `ServiceType`
- `TransitTime` when available
- `EstimatedDeliveryDate` when available
11. Preserve selection key compatibility by using provider/service code consistently
12. Never hardcode shipping tax logic in provider
13. Use cancellation tokens across all async calls

## Error Handling Expectations

Provider errors should:
- Return `ShippingRateQuote` with `Errors` populated when possible
- Avoid throwing for known carrier/business errors
- Throw only for unexpected failure paths that cannot be represented as quote errors

Manager and service layers already isolate provider failures per-provider to avoid taking down full checkout quote resolution.

## Testing Checklist

Add tests for:
1. `IsAvailableFor` behavior
2. `ConfigureAsync` with valid and malformed settings
3. `GetRatesAsync` success mapping
4. Currency conversion behavior when carrier currency != request currency
5. `GetRatesForServicesAsync` filtering and markup behavior
6. `GetRatesForAllServicesAsync` exclusions and per-service markup behavior
7. Transit-time mapping into `ShippingServiceLevel.TransitTime`
8. Selection key parse compatibility (`dyn:{provider}:{serviceCode}`)
9. Delivery-day mapping path in grouping/invoice/fulfilment integration tests

Useful existing tests:
- `src/Merchello.Tests/Shipping/ShippingQuoteServiceTests.cs`
- `src/Merchello.Tests/Shipping/DynamicShippingProviderTests.cs`
- `src/Merchello.Tests/Shipping/SelectionKeyExtensionsTests.cs`
- `src/Merchello.Tests/Checkout/Strategies/DefaultOrderGroupingStrategyTests.cs`

## Common Mistakes To Avoid

1. Using outdated checkout endpoints
- Correct endpoints are:
  - `GET /api/merchello/checkout/shipping-groups`
  - `POST /api/merchello/checkout/shipping`

2. Assuming dynamic providers skip `GetRatesForServicesAsync`
- They do not. Basket-level filtered flow uses this method when service types are configured.

3. Assuming old table names for provider config
- Use `merchelloProviderConfigurations` and warehouse `ProviderConfigsJson`.

4. Returning rates in carrier account currency without conversion
- Convert to request/basket currency using exchange rate services.

5. Omitting transit time for dynamic services
- This weakens fulfilment service mapping quality.

6. Re-implementing fulfilment mapping in provider code
- Keep mapping centralized in invoice + fulfilment services.

## Minimal Provider Skeleton

```csharp
public class MyCarrierShippingProvider(
    ICurrencyService currencyService,
    IExchangeRateCache exchangeRateCache)
    : ShippingProviderBase(currencyService)
{
    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "my-carrier",
        DisplayName = "My Carrier",
        SupportsRealTimeRates = true,
        RequiresFullAddress = true,
        ConfigCapabilities = new ProviderConfigCapabilities
        {
            HasLocationBasedCosts = false,
            HasWeightTiers = false,
            UsesLiveRates = true,
            RequiresGlobalConfig = true
        }
    };

    public override ValueTask<IReadOnlyList<ShippingServiceType>> GetSupportedServiceTypesAsync(
        CancellationToken cancellationToken = default) =>
        ValueTask.FromResult<IReadOnlyList<ShippingServiceType>>(
        [
            new ShippingServiceType { Code = "GROUND", DisplayName = "Ground", ProviderKey = "my-carrier" }
        ]);

    public override async ValueTask ConfigureAsync(
        ShippingProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        await base.ConfigureAsync(configuration, cancellationToken);
        // Parse config and initialize API client.
    }

    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        return !request.IsEstimateMode && request.Packages.Count > 0;
    }

    public override async Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request,
        CancellationToken cancellationToken = default)
    {
        // Call carrier API, convert currency, map to ShippingServiceLevel.
        throw new NotImplementedException();
    }
}
```

## Final Rule

When in doubt, follow the FedEx provider structure and verify behavior by tracing this path in code:
- Checkout controller -> CheckoutService -> DefaultOrderGroupingStrategy -> ShippingQuoteService -> Provider
- Then invoice creation and fulfilment mapping for selected option execution
