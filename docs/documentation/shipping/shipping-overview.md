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

| Service | Purpose |
|---------|---------|
| `IShippingService` | Business logic and orchestration for basket/product shipping |
| `IShippingQuoteService` | Fetches quotes from shipping providers (FedEx, UPS, flat-rate) |
| `IShippingCostResolver` | Resolves costs from flat-rate shipping option configurations |

### Cost Resolution Priority

For flat-rate shipping, costs are resolved in this priority order:

1. **State/Region** -- A cost entry matching the exact state/province code
2. **Country** -- A cost entry matching the country code
3. **Universal** -- A cost entry with country code `*` (wildcard)
4. **Fixed Cost** -- The shipping option's fallback fixed cost

```csharp
// IShippingCostResolver resolves in priority order
decimal? cost = shippingCostResolver.ResolveBaseCost(
    costs: shippingOption.Costs,
    countryCode: "US",
    regionCode: "CA",
    fixedCostFallback: shippingOption.FixedCost);
```

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

Merchello separates shipping from fulfilment -- this is an important distinction:

| Concern | Shipping | Fulfilment |
|---------|----------|------------|
| Purpose | Customer-facing rates and delivery options | 3PL submission, status tracking, inventory sync |
| When | At checkout (before payment) | After payment (order processing) |
| Who sees it | The customer | The warehouse/3PL |
| Providers | FedEx, UPS, Flat-rate | Fulfilment-specific providers |

Never mix carrier quoting logic (shipping) with warehouse submission logic (fulfilment).

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

Shipping selections use a stable key format that you should never change:

| Type | Format | Example |
|------|--------|---------|
| Flat-rate | `so:{guid}` | `so:abc12345-...` |
| Dynamic | `dyn:{provider}:{serviceCode}` | `dyn:fedex:FEDEX_GROUND` |

These keys are parsed into order fields (`ShippingProviderKey`, `ShippingServiceCode`, `ShippingServiceName`) and must remain stable across the checkout flow.

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

| Method | Purpose |
|--------|---------|
| `GetShippingOptionsForBasket(params)` | Get grouped shipping options for the basket |
| `GetShippingSummaryForReview(basket, address, selections)` | Get shipping summary for order review |
| `GetRequiredWarehouses(basket, address)` | Determine which warehouses are needed |
| `GetAllShippingOptions()` | List all shipping options in the system |
| `GetShippingOptionsForProductAsync(productId, country, region)` | Get options for a product page |
| `GetShippingOptionByIdAsync(id)` | Get a specific shipping option |
| `GetShippingOptionsForWarehouseAsync(warehouseId, country, state)` | Get options for a warehouse to a destination |
| `GetFulfillmentOptionsForProductAsync(productId, country, state)` | Get best warehouse for a product |
| `GetDefaultFulfillingWarehouseAsync(productId)` | Get default warehouse (no address known) |

---

## Shipping Tax

Shipping can be taxable depending on jurisdiction. Merchello supports multiple shipping tax modes:

| Mode | Behavior |
|------|----------|
| `NotTaxed` | Shipping is not taxable |
| `FixedRate` | Apply a fixed tax rate to shipping |
| `Proportional` | Tax rate proportional to basket item tax rates |
| `ProviderCalculated` | Tax provider determines from full order context |

The shipping tax configuration is queried via `ITaxProviderManager.GetShippingTaxConfigurationAsync()`. See the tax documentation for details.

> **Warning:** Never hardcode shipping tax rates. Always query the tax provider for the correct rate.
