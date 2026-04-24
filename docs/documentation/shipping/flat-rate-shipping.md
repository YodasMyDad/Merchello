# Flat Rate Shipping

Flat rate shipping lets you configure fixed shipping costs based on destination country, state/province, and package weight. No external API calls are needed -- costs are stored in your database and looked up at checkout.

## How It Works

The flat-rate provider ([`FlatRateShippingProvider`](../../../src/Merchello.Core/Shipping/Providers/BuiltIn/FlatRateShippingProvider.cs), key `flat-rate`) uses `ShippingOption` records with associated `ShippingCost` entries to determine the shipping price. You create shipping options (like "Standard Shipping" or "Express Delivery") and then add cost entries for each destination you ship to.

Cost lookup is delegated to [`ShippingCostResolver`](../../../src/Merchello.Core/Shipping/Services/ShippingCostResolver.cs) -- the single source of truth for flat-rate matching. `FlatRateShippingProvider` never duplicates the match logic; it consumes a pre-resolved `DestinationCost`.

> **Invariant (CLAUDE.md):** Only flat-rate options carry fixed costs in the DB. Dynamic providers (`UsesLiveRates = true`) must NOT use fixed-cost entries. If you want a carrier-named option at a fixed price, create it as `ProviderKey = "flat-rate"`.

---

## Creating a Shipping Option

Shipping options are created in the backoffice under **Shipping > Shipping Options** or via the API:

```
POST /umbraco/api/v1/shipping-options
```

```json
{
  "name": "Standard Shipping",
  "providerKey": "flat-rate",
  "warehouseId": "...",
  "fixedCost": 5.99,
  "daysFrom": 3,
  "daysTo": 5,
  "isNextDay": false
}
```

### Configuration Fields

| Field | Description |
|-------|-------------|
| `name` | Display name shown to customers (e.g., "Standard Shipping") |
| `fixedCost` | Fallback cost when no destination-specific rate matches (0 = free shipping) |
| `daysFrom` | Minimum delivery days (shown as estimated range) |
| `daysTo` | Maximum delivery days |
| `isNextDay` | Flag for next-day delivery options |

---

## Destination-Based Costs

Each shipping option can have multiple cost entries for different destinations. Costs are looked up using a priority system:

### Priority Order

1. **State/Region match** -- e.g., cost for "US-CA" (California)
2. **Country match** -- e.g., cost for "US" (United States)
3. **Universal match** -- cost with country code `*` (applies to all destinations)
4. **Fixed cost fallback** -- the shipping option's `fixedCost` value

### Example Setup

| Destination | Country | Region | Cost |
|------------|---------|--------|------|
| California | US | CA | $3.99 |
| United States (other) | US | | $5.99 |
| United Kingdom | GB | | $12.99 |
| All other countries | * | | $19.99 |

With this setup:
- A customer in California pays **$3.99**
- A customer in New York pays **$5.99** (matches US country)
- A customer in London pays **$12.99** (matches GB)
- A customer in Australia pays **$19.99** (matches universal `*`)
- If none matched and no `*` exists, the **fixedCost** is used

### Adding Costs via API

```
POST /umbraco/api/v1/shipping-options/{id}/costs
```

```json
{
  "countryCode": "US",
  "regionCode": "CA",
  "cost": 3.99
}
```

---

## Weight Tiers

For products with varying weights, you can add weight-based surcharges to shipping options. Weight tiers add a surcharge on top of the base destination cost.

### How Weight Tiers Work

Each tier specifies a weight threshold (in kilograms) and a surcharge amount. The surcharge from the matching tier is added to the base shipping cost.

| Weight From (kg) | Country | Region | Surcharge |
|------------------|---------|--------|-----------|
| 5.0 | US | | $2.00 |
| 10.0 | US | | $5.00 |
| 20.0 | US | | $10.00 |
| 5.0 | * | | $3.00 |
| 10.0 | * | | $7.00 |

For a 12kg package shipping to the US:
- Base cost: $5.99 (from destination costs)
- Weight surcharge: $5.00 (matches the 10kg tier for US)
- **Total: $10.99**

Weight tiers use the same priority matching as destination costs (State > Country > Universal).

### Adding Weight Tiers via API

```
POST /umbraco/api/v1/shipping-options/{id}/weight-tiers
```

```json
{
  "weightFromKg": 5.0,
  "countryCode": "US",
  "regionCode": null,
  "surcharge": 2.00
}
```

---

## Postcode-Based Rules

Flat-rate shipping supports postcode matching for more granular pricing. Postcode rules can use:

- **Exact match**: `SW1A 1AA`
- **Prefix match**: `SW1*` (matches all postcodes starting with SW1)
- **Range match**: `90001-90099` (matches US zip codes in range)

The `IPostcodeMatcher` service handles matching logic. Postcode rules are evaluated during cost resolution and can override country/state-level costs.

---

## Assigning to Warehouses

Shipping options are assigned to specific warehouses. Each warehouse can have different shipping options and costs. This supports scenarios like:

- Warehouse A (domestic) offers Standard and Express shipping
- Warehouse B (international) offers International Standard only
- Different warehouses have different costs for the same destination

At checkout, when items are grouped by warehouse, only the shipping options assigned to that warehouse appear.

---

## Currency Conversion

Shipping costs are stored in the **store currency**. When a customer views prices in a different display currency:

1. The exchange rate is looked up from the `IExchangeRateCache`
2. The cost is converted using the display rate
3. Tax-inclusive adjustments are applied if configured

This happens automatically -- you don't need to store costs in multiple currencies.

---

## Backoffice API Reference

### Shipping Options

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shipping-options` | List all shipping options |
| GET | `/shipping-options/{id}` | Get option with costs and tiers |
| POST | `/shipping-options` | Create a shipping option |
| PUT | `/shipping-options/{id}` | Update a shipping option |
| DELETE | `/shipping-options/{id}` | Delete a shipping option |

### Costs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/shipping-options/{id}/costs` | Add a cost entry |
| PUT | `/shipping-options/{id}/costs/{costId}` | Update a cost entry |
| DELETE | `/shipping-options/{id}/costs/{costId}` | Remove a cost entry |

### Weight Tiers

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/shipping-options/{id}/weight-tiers` | Add a weight tier |
| PUT | `/shipping-options/{id}/weight-tiers/{tierId}` | Update a weight tier |
| DELETE | `/shipping-options/{id}/weight-tiers/{tierId}` | Remove a weight tier |

---

## Tips

> **Tip:** Use the universal (`*`) destination as a catch-all. Without it, customers in countries without a specific cost entry will only see the `fixedCost` fallback.

> **Tip:** Set `fixedCost` to `0` for free shipping as a fallback. For flat-rate options, a null `FixedCost` is normalized to `0` in [`ShippingCostResolver.GetTotalShippingCost()`](../../../src/Merchello.Core/Shipping/Services/ShippingCostResolver.cs) so the option always resolves.

> **Tip:** The delivery day range (`daysFrom`/`daysTo`) is displayed to customers at checkout. Keep these realistic -- they set customer expectations.

## Related Topics

- [Shipping Overview](shipping-overview.md)
- [Dynamic Shipping Providers](dynamic-shipping-providers.md) -- live carrier rates (cannot be combined with fixed costs)
- [Order Grouping Strategies](order-grouping.md)
- [Package Configuration](package-configuration.md) -- weight-tier inputs
- [Shipping Tax](../tax/shipping-tax.md)
