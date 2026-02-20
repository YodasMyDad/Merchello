# Shipping Provider Architecture

Last reviewed against code: 2026-02-20

This document describes the current shipping provider architecture in Merchello.

## Overview

Merchello shipping is a pluggable provider system with:
- Provider discovery via `ExtensionManager`
- Runtime orchestration via `ShippingQuoteService`
- Checkout grouping via `IOrderGroupingStrategy` (default: warehouse grouping)
- Stable selection contract via `SelectionKey`
- Fulfilment mapping bridge through shipping service category inference

Built-in providers:
- `flat-rate`
- `fedex`
- `ups`

## Core Components

### Provider interface and base

- `IShippingProvider`
  - `src/Merchello.Core/Shipping/Providers/Interfaces/IShippingProvider.cs`
- `ShippingProviderBase`
  - `src/Merchello.Core/Shipping/Providers/ShippingProviderBase.cs`

### Discovery and configuration

- `IShippingProviderManager`
  - `src/Merchello.Core/Shipping/Providers/Interfaces/IShippingProviderManager.cs`
- `ShippingProviderManager`
  - `src/Merchello.Core/Shipping/Providers/ShippingProviderManager.cs`

### Quote orchestration

- `IShippingQuoteService`
  - `src/Merchello.Core/Shipping/Services/Interfaces/IShippingQuoteService.cs`
- `ShippingQuoteService`
  - `src/Merchello.Core/Shipping/Services/ShippingQuoteService.cs`

### Dynamic provider warehouse config

- `IWarehouseProviderConfigService`
  - `src/Merchello.Core/Shipping/Services/Interfaces/IWarehouseProviderConfigService.cs`
- `WarehouseProviderConfigService`
  - `src/Merchello.Core/Shipping/Services/WarehouseProviderConfigService.cs`
- `WarehouseProviderConfig`
  - `src/Merchello.Core/Shipping/Models/WarehouseProviderConfig.cs`

## Storage Model

### Provider global config

- Table: `merchelloProviderConfigurations`
- TPH discriminator: `ProviderType` (`Shipping` for shipping configs)
- Mapping: `src/Merchello.Core/Shared/Providers/ProviderConfigurationDbMapping.cs`

### Shipping methods and local cost models

- Shipping methods: `merchelloShippingOptions`
- Related cost/tier tables for flat-rate style logic
- `ShippingOption.ProviderSettings` holds method-level JSON settings

### Warehouse-level dynamic provider config

- Stored as JSON in `merchelloWarehouses.ProviderConfigsJson`
- Not stored in a separate `merchelloWarehouseProviderConfigs` table
- Mapping/model:
  - `src/Merchello.Core/Warehouses/Models/Warehouse.cs`
  - `src/Merchello.Core/Warehouses/Mapping/WarehouseDbMapping.cs`

## Request and Quote Models

- `ShippingQuoteRequest`
  - `src/Merchello.Core/Shipping/Providers/ShippingQuoteRequest.cs`
- `ShippingRateQuote`
  - `src/Merchello.Core/Shipping/Providers/ShippingRateQuote.cs`
- `ShippingServiceLevel`
  - `src/Merchello.Core/Shipping/Providers/ShippingServiceLevel.cs`
- `ShippingServiceType`
  - `src/Merchello.Core/Shipping/Models/ShippingServiceType.cs`
- `ShippingOptionInfo`
  - `src/Merchello.Core/Shipping/Models/ShippingOptionInfo.cs`

## SelectionKey Contract

Selection keys are stable and parsed centrally:
- Flat-rate: `so:{guid}`
- Dynamic: `dyn:{provider}:{serviceCode}`
- Legacy plain GUID still supported

Source:
- `src/Merchello.Core/Shipping/Extensions/SelectionKeyExtensions.cs`

## Runtime Flow

### Checkout shipping group flow

1. `CheckoutApiController.GetShippingGroups` calls `CheckoutService.GetOrderGroupsAsync`
2. `CheckoutService` resolves products/warehouses and invokes configured grouping strategy
3. Default strategy (`DefaultOrderGroupingStrategy`) builds groups and options
4. `PopulateDynamicProviderRatesAsync` enriches groups with dynamic quotes per warehouse

Files:
- `src/Merchello/Controllers/CheckoutApiController.cs`
- `src/Merchello.Core/Checkout/Services/CheckoutService.cs`
- `src/Merchello.Core/Checkout/Strategies/DefaultOrderGroupingStrategy.cs`

### Quote service method selection

`ShippingQuoteService` has two quote paths:

1. Basket-level path: `GetQuotesAsync`
- If provider is live-rate and basket has configured service types for it:
  - Calls `GetRatesForServicesAsync(request, serviceTypes, shippingOptions)`
- Otherwise uses `GetRatesAsync`

2. Warehouse dynamic path: `GetQuotesForWarehouseAsync`
- For enabled live-rate providers:
  - Calls `GetRatesForAllServicesAsync(request, warehouseConfig)`

File:
- `src/Merchello.Core/Shipping/Services/ShippingQuoteService.cs`

### Order creation and fulfilment bridge

1. Invoice creation parses selected `SelectionKey` into flat-rate vs dynamic selection
2. Order fields are set:
- `ShippingProviderKey`
- `ShippingServiceCode`
- `ShippingServiceName`
- `ShippingServiceCategory` (inferred)

3. Fulfilment resolves final shipping method code with fallback chain:
- `ServiceCategoryMapping_{Category}`
- `DefaultShippingMethod`
- raw `Order.ShippingServiceCode`

Files:
- `src/Merchello.Core/Accounting/Services/InvoiceService.cs`
- `src/Merchello.Core/Fulfilment/Services/FulfilmentService.cs`

## Dynamic Provider and Fulfilment Integration

Transit metadata propagation path:

1. Provider returns `ShippingServiceLevel.TransitTime`
2. Default grouping maps to `ShippingOptionInfo.DaysFrom/DaysTo`
3. `InvoiceService.InferServiceCategory(...)` infers service category
4. Fulfilment mapping chooses provider-specific method code via settings JSON

Important guard:
- If any product in a group has `ProductRoot.AllowExternalCarrierShipping = false`, dynamic carrier options are blocked for that group.

Days override source:
- `WarehouseProviderConfig.DefaultDaysFromOverride`
- `WarehouseProviderConfig.DefaultDaysToOverride`

## Provider Capability Model

Provider capability fields are exposed through `ShippingProviderMetadata`.

Key config capability flags:
- `HasLocationBasedCosts`
- `HasWeightTiers`
- `UsesLiveRates`
- `RequiresGlobalConfig`

Dynamic providers typically use:
- `UsesLiveRates = true`
- `RequiresGlobalConfig = true`
- `HasLocationBasedCosts = false`
- `HasWeightTiers = false`

## FedEx and UPS as Reference Patterns

FedEx and UPS implementations show the intended dynamic-provider architecture:
- Global API credential configuration
- OAuth token acquisition and refresh
- Carrier live-rate quote mapping into `ShippingServiceLevel`
- Currency conversion to basket/request currency
- Dynamic warehouse exclusions/markup through `WarehouseProviderConfig`

Reference files:
- `src/Merchello.Core/Shipping/Providers/FedEx/FedExShippingProvider.cs`
- `src/Merchello.Core/Shipping/Providers/FedEx/FedExApiClient.cs`
- `src/Merchello.Core/Shipping/Providers/UPS/UpsShippingProvider.cs`
- `src/Merchello.Core/Shipping/Providers/UPS/UpsApiClient.cs`

## Design Invariants

1. Do not duplicate checkout totals or shipping tax calculations in providers
2. Keep selection key format stable
3. Keep provider key stable once released
4. Preserve dynamic-to-fulfilment day/category mapping path
5. For live-rate providers, always return normalized currency and service metadata
6. Keep provider errors isolated so one provider failure does not collapse all shipping options

## Troubleshooting Checklist

1. No dynamic options appear:
- Verify provider is enabled in `merchelloProviderConfigurations`
- Verify warehouse has provider config enabled in `ProviderConfigsJson`
- Verify group products allow external carrier shipping
- Verify request includes shippable package weight

2. Wrong fulfilment method selected:
- Check `DaysFrom/DaysTo` mapping in group option
- Check inferred `ShippingServiceCategory` on order
- Check fulfilment settings keys `ServiceCategoryMapping_*` and `DefaultShippingMethod`

3. Live rates return but filtering is wrong:
- Verify service codes in `GetSupportedServiceTypesAsync`
- Verify `ShippingOption.ServiceType` values match carrier codes
- Verify `GetRatesForServicesAsync` filtering uses service type codes

4. Markup/exclusions not applied as expected:
- Verify warehouse config JSON for provider
- Verify service code casing and exclusions list
- Verify quote path (basket-level filtered vs warehouse dynamic)
