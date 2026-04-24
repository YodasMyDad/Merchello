# Shipping System Overview

Merchello's shipping system supports both flat-rate configured shipping and dynamic real-time carrier rates. This guide covers the architecture, how the pieces fit together, and the key concepts you need to understand.

## Key Concepts

### Flat-Rate vs Dynamic Providers

Merchello has two types of shipping providers:

**Flat-rate providers** use pre-configured destination-based costs:
- You set up shipping options with costs per country/state
- Costs are looked up from the database at checkout
- No external API calls needed
- Example: "Standard Shipping: $5.99 to US, $12.99 to UK"

**Dynamic providers** fetch live rates from carrier APIs:
- Real-time quotes from FedEx, UPS, etc.
- Rates vary by package weight, dimensions, and destination
- Requires API credentials and network access
- Example: "FedEx Ground: $8.47 (calculated by FedEx)"

### Shipping Options

A shipping option represents a service level (e.g., "Standard Shipping", "Express Delivery"). For flat-rate providers, each option has associated costs by destination. For dynamic providers, shipping options are created per carrier service type.

### Shipping Groups

At checkout, basket items are grouped by warehouse. Each group has its own set of available shipping options. This handles the common scenario where items ship from different warehouses.

---

## Architecture

Shipping functionality is split across three services:

| Service | Purpose | Source |
|---------|---------|--------|
| `IShippingService` | Business logic and orchestration for basket/product shipping | [IShippingService.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Shipping/Services/Interfaces/IShippingService.cs) |
| `IShippingQuoteService` | Fetches quotes from shipping providers (FedEx, UPS, flat-rate) | [IShippingQuoteService.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Shipping/Services/Interfaces/IShippingQuoteService.cs) |
| `IShippingCostResolver` | Resolves costs from flat-rate shipping option configurations | [ShippingCostResolver.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Shipping/Services/ShippingCostResolver.cs) |

> **Invariant (CLAUDE.md):** `IShippingService.GetShippingOptionsForBasket()` is the basket-level entry point; it uses the active `IOrderGroupingStrategy` internally. `IShippingQuoteService.GetQuotes*()` is the source of truth for quote retrieval. `ShippingCostResolver.ResolveBaseCost()` is the single source of truth for the flat-rate fallback chain -- do not reimplement the match logic anywhere else.

### Cost Resolution Priority

For flat-rate shipping, costs are resolved in this strict priority order by [`ShippingCostResolver.ResolveBaseCost()`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Shipping/Services/ShippingCostResolver.cs):

1. **State/Region** -- A cost entry matching the exact country + state/province code
2. **Country** -- A cost entry matching the country code with no region
3. **Universal** -- A cost entry with country code `*` (wildcard, no region)
4. **Fixed Cost** -- The shipping option's fallback `FixedCost` (normalized to `0` for flat-rate when null)

```csharp
// IShippingCostResolver resolves in priority order
decimal? cost = shippingCostResolver.ResolveBaseCost(
    costs: shippingOption.ShippingCosts,
    countryCode: "US",
    regionCode: "CA",
    fixedCostFallback: shippingOption.FixedCost);
```

> **Dynamic providers (`UsesLiveRates = true`) must NOT rely on fixed-cost entries.** Carrier rates are fetched live from the provider API at checkout. If you need a flat-rate option named after a carrier (e.g., "FedEx Ground" at a fixed $8.99), create it with `ProviderKey = "flat-rate"` rather than `ProviderKey = "fedex"`.

### Warehouse-Based Shipping

Shipping is warehouse-centric. Each warehouse:

- Has service regions (countries/states it can ship to)
- Has shipping options assigned to it
- Can have dynamic provider configurations (FedEx, UPS)
- Has priority ordering for stock allocation

At checkout, items are allocated to warehouses based on:
1. `ProductRootWarehouse` priority ordering
2. Service region eligibility (can this warehouse ship there?)
3. Stock availability (`Stock - Reserved >= quantity`)

---

## Shipping vs Fulfilment

Merchello keeps shipping (customer-facing rate quoting) strictly separate from fulfilment (back-of-house 3PL workflow). This is a CLAUDE.md invariant:

| Concern | Shipping | Fulfilment |
|---------|----------|------------|
| Purpose | Customer-facing rates and delivery options | 3PL submission, status tracking, inventory sync |
| When | At checkout (before payment) | After payment (order processing) |
| Who sees it | The customer | The warehouse/3PL |
| Built-in providers | Flat Rate, FedEx, UPS | ShipBob, Supplier Direct |
| Interfaces | `IShippingProvider` | `IFulfilmentProvider` |

**Never mix carrier quoting logic (shipping) with warehouse submission logic (fulfilment).** The shipping service category inferred at checkout (`Standard`, `Express`, `Overnight`, `Economy`) is passed to fulfilment providers, which map it to their own method names -- that is the only bridge. See [Fulfilment Overview](../fulfilment/fulfilment-overview.md).

---

## Checkout Flow

Here's how shipping works during checkout:

1. **Customer enters address** -- the checkout initializes with their country/state
2. **Order grouping** -- items are grouped by warehouse based on stock and service regions
3. **Quote fetching** -- each group gets shipping options:
   - Flat-rate: costs looked up from `ShippingCost` table
   - Dynamic: live rates fetched from carrier APIs
4. **Customer selects shipping** -- one option per group
5. **Totals calculated** -- shipping costs added to the basket total
6. **Selection stored** -- shipping selections saved in the checkout session

### Selection Key Contract

Shipping selections use a stable key format that must remain unchanged:

| Type | Format | Example |
|------|--------|---------|
| Flat-rate | `so:{guid}` | `so:abc12345-...` |
| Dynamic | `dyn:{provider}:{serviceCode}` | `dyn:fedex:FEDEX_GROUND` |

These keys are parsed by [`SelectionKeyExtensions.TryParse()`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Shipping/Extensions/SelectionKeyExtensions.cs) into order fields (`ShippingProviderKey`, `ShippingServiceCode`, `ShippingServiceName`) and must remain stable across the checkout flow and any custom grouping strategies.

> **Invariant (CLAUDE.md):** Treat this contract as wire-protocol. Checkout, order edit, notifications, and fulfilment all rely on it. Keep the parsed rate in `QuotedCosts` so dynamic rates seen at selection time are what the customer pays.

---

## Product Shipping Restrictions

Products can be restricted from certain shipping methods:

- **`ProductRoot.AllowExternalCarrierShipping = false`** blocks dynamic carrier options for those products (only flat-rate options are shown)
- **Non-shippable products** (digital, services) are excluded from shipping groups entirely
- **Weight and dimensions** from the product's package configuration are sent to carrier APIs

---

## Built-in Providers

| Provider | Type | Live Rates | Tracking | International |
|----------|------|------------|----------|---------------|
| Flat Rate | Static | No | No | Yes |
| FedEx | Dynamic | Yes | Yes | Yes |
| UPS | Dynamic | Yes | Yes | Yes |

See [Flat Rate Shipping](flat-rate-shipping.md) and [Dynamic Shipping Providers](dynamic-shipping-providers.md) for detailed setup guides.

---

## IShippingService Reference

Defined in [`IShippingService.cs`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Shipping/Services/Interfaces/IShippingService.cs):

| Method | Purpose |
|--------|---------|
| `GetShippingOptionsForBasket(parameters, ct)` | Get grouped shipping options for the basket (uses the active `IOrderGroupingStrategy` internally) |
| `GetShippingSummaryForReview(basket, address, selections, ct)` | Get shipping summary for order review |
| `GetRequiredWarehouses(basket, address, ct)` | Determine which warehouses are needed to fulfill the basket |
| `GetAllShippingOptions(ct)` | List all shipping options in the system |
| `GetShippingOptionsForProductAsync(productId, country, region, ct)` | Get options for a product detail page |
| `GetShippingOptionByIdAsync(id, ct)` | Get a specific shipping option |
| `GetShippingOptionsForWarehouseAsync(warehouseId, country, state, ct)` | Get options for a warehouse to a destination |
| `GetFulfillmentOptionsForProductAsync(productId, country, state, ct)` | Get best warehouse for a product at a destination |
| `GetDefaultFulfillingWarehouseAsync(productId, ct)` | Get default warehouse for a product when no address is known |

---

## Shipping Tax

Shipping can be taxable depending on jurisdiction. Merchello supports four shipping tax modes:

| Mode | Behavior |
|------|----------|
| `NotTaxed` | Shipping is not taxable |
| `FixedRate` | Apply the returned fixed tax rate to shipping |
| `Proportional` | Tax rate is a weighted average of basket item tax rates (EU/UK VAT) |
| `ProviderCalculated` | Tax provider determines from full order context (e.g., Avalara) |

The shipping tax configuration is queried via [`ITaxProviderManager.GetShippingTaxConfigurationAsync(countryCode, stateCode)`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Tax/Providers/Interfaces/ITaxProviderManager.cs) and returned as a [`ShippingTaxConfigurationResult`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Tax/Providers/Models/ShippingTaxConfigurationResult.cs). Proportional math is centralized in [`ITaxCalculationService.CalculateProportionalShippingTax()`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Tax/Services/Interfaces/ITaxCalculationService.cs). See [Shipping Tax](../tax/shipping-tax.md) for the full model.

> **Invariant (CLAUDE.md):** Never hardcode shipping tax rates. Always query the tax provider. Never reimplement the proportional formula outside `ITaxCalculationService`.

## Related Topics

- [Flat Rate Shipping](flat-rate-shipping.md)
- [Dynamic Shipping Providers](dynamic-shipping-providers.md)
- [Order Grouping Strategies](order-grouping.md)
- [Package Configuration](package-configuration.md)
- [Shipments (Fulfilment Records)](shipments.md)
- [Checkout -- Shipping Selection](../checkout/checkout-shipping.md)
- [Fulfilment Overview](../fulfilment/fulfilment-overview.md)
- [Tax Overview](../tax/tax-overview.md)
- [Creating Shipping Providers](../extending/creating-shipping-providers.md)
