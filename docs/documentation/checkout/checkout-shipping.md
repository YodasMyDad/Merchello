# Checkout Shipping Selection

During checkout the customer selects a shipping method for each order group. This page explains how order grouping works, the split between flat-rate and dynamic (live-rate) shipping, and how selections flow from the UI into the invoice.

**What it is:** The shipping step. Produces a set of `OrderGroup`s per basket, each with its own available shipping options and one selection.

**Why you need to understand it:** Every basket is at least one order group (one warehouse). Multi-warehouse or vendor baskets produce multiple groups and the customer must pick shipping for each one. Getting the order-grouping, selection-key, and quoted-cost contracts right is what makes multi-warehouse and live-rate carrier checkouts work.

Source: [ICheckoutService.cs](../../../src/Merchello.Core/Checkout/Services/Interfaces/ICheckoutService.cs), [DefaultOrderGroupingStrategy.cs](../../../src/Merchello.Core/Checkout/Strategies/DefaultOrderGroupingStrategy.cs), [OrderGroup.cs](../../../src/Merchello.Core/Checkout/Strategies/Models/OrderGroup.cs).

## Order Grouping

When a basket contains products from multiple warehouses, the line items are split into **order groups**. Each group gets its own available shipping options and a single selection, and each group becomes a separate order (invoice line allocation) downstream.

Order grouping is pluggable via `IOrderGroupingStrategy`. Configured via `MerchelloSettings.OrderGroupingStrategy` (top-level key, not nested under `Checkout`):

```json
{
  "Merchello": {
    "OrderGroupingStrategy": "vendor-grouping"
  }
}
```

Strategies are discovered by `ExtensionManager`. The default strategy key is `default-warehouse` (grouping by warehouse, multi-warehouse allocation supported). Custom strategies can group by vendor, delivery window, or anything else — see [Custom Order Grouping](../extending/custom-order-grouping.md).

### Getting Order Groups

`GetOrderGroupsParameters` takes the basket and the current checkout session (which supplies the shipping address and any previous selections) — **not a bare country code**:

```csharp
var session = await checkoutSessionService.GetSessionAsync(basket.Id, ct);

var result = await checkoutService.GetOrderGroupsAsync(
    new GetOrderGroupsParameters
    {
        Basket = basket,
        Session = session
    },
    ct);

if (result.Success)
{
    foreach (var group in result.Groups)
    {
        // group.GroupId                   -- deterministic ID (stable across requests)
        // group.GroupName                 -- display name (e.g. "Shipment from London")
        // group.WarehouseId               -- fulfilling warehouse (null for non-warehouse strategies)
        // group.LineItems                 -- ShippingLineItem list (LineItemId, Sku, Quantity, Amount)
        // group.AvailableShippingOptions  -- ShippingOptionInfo list (includes both flat-rate and live-rate)
        // group.SelectedShippingOptionId  -- current SelectionKey (null if not selected)
    }
}
```

The strategy validates the shipping address — if `ShippingAddress.CountryCode` is empty, the result fails with `"Shipping address must have a valid country code"`. Flat-rate costs are recomputed against the final per-group package weight, then dynamic carrier rates (FedEx, UPS, etc.) are fetched sequentially (EF Core scope is `AsyncLocal` and does not support concurrency).

## Flat-Rate vs Dynamic Shipping

### Flat-Rate Shipping

Flat-rate providers use pre-configured rates based on destination. The `ShippingCostResolver` looks up cost by priority:

```text
State -> Country -> Universal(*) -> FixedCost
```

**Selection key format:** `so:{guid}` where the GUID is the `ShippingOption.Id`.

### Dynamic Shipping

Dynamic (live-rate) providers such as FedEx, UPS, and USPS fetch rates live from the carrier API at the shipping step. They declare `UsesLiveRates = true` in their metadata and are populated by `DefaultOrderGroupingStrategy.PopulateDynamicProviderRatesAsync` after flat-rate pricing has run.

**Selection key format:** `dyn:{provider}:{serviceCode}` (e.g. `dyn:fedex:FEDEX_GROUND`).

Key differences from flat-rate:

- Rates are fetched live from the carrier — there are no fixed-cost database entries.
- Visibility depends on provider enablement (`IShippingProviderManager.GetEnabledProvidersAsync`) and warehouse configuration.
- Can be blocked per product via `ProductRoot.AllowExternalCarrierShipping = false` — when false, dynamic options are skipped for any group containing that product.

> **Invariant — selection key contract:** Do not invent new key formats. Anything parsed outside `SelectionKeyExtensions.TryParse` will break order creation, invoice fields, and fulfilment routing.

## Making a Shipping Selection

### Via the Checkout Service

The service variant is what controllers use — it wraps session save, basket recalculation, and discount refresh in one call.

```csharp
var session = await checkoutSessionService.GetSessionAsync(basket.Id, ct);

var result = await checkoutService.SaveShippingSelectionsAsync(
    new SaveShippingSelectionsParameters
    {
        Basket = basket,
        Session = session,
        Selections = new Dictionary<Guid, string>
        {
            [group1Id] = "so:flat-rate-option-guid",
            [group2Id] = "dyn:fedex:FEDEX_GROUND"
        },
        QuotedCosts = new Dictionary<Guid, decimal>
        {
            [group1Id] = 5.99m,
            [group2Id] = 12.50m   // rate shown to customer, preserved to invoice
        }
    },
    ct);
```

`QuotedCosts` here is `Dictionary<Guid, decimal>` (not the `QuotedShippingCost` record — that's only used on the session layer and is wrapped with a timestamp inside `CheckoutService`).

This method validates that every group has a selection, captures quoted costs, calls `CalculateBasketAsync()` to update totals (the single source of truth for basket math), refreshes any shipping-dependent discounts, and persists the basket and session to the database.

### Via the Initialize Endpoint

For single-page checkout, use the initialize endpoint with `autoSelectShipping: true`:

```javascript
const response = await fetch('/api/merchello/checkout/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        countryCode: 'GB',
        autoSelectShipping: true
    })
});

const data = await response.json();
// data.shippingGroups -- array of groups with available options
// data.combinedShippingTotal -- total shipping cost across all groups
```

When `autoSelectShipping` is `true`, the cheapest option is automatically selected for each group.

## Quoted Shipping Costs

When a shipping method is selected, the quoted cost is captured and stored in the checkout session. This rate is honoured through to order creation, even if the provider's live rates change between selection and payment.

This is important for dynamic providers where rates can fluctuate. The customer pays the rate they were shown.

## Estimated Shipping (Pre-Checkout)

On the basket page, before entering checkout, you can show an estimated shipping cost:

```javascript
const response = await fetch(
    '/api/merchello/storefront/basket/estimated-shipping?countryCode=GB'
);
const data = await response.json();
// data.combinedShippingTotal
// data.formattedCombinedShippingTotal
```

This auto-selects the cheapest option per group and returns the combined total. It does not save anything to the checkout session.

## How Selection Keys Map to Orders

When the order is created, selection keys are parsed (via `SelectionKeyExtensions.TryParse`) into invoice-level fields:

| Key Format | Invoice Fields |
|------------|----------------|
| `so:{guid}` | `ShippingProviderKey = "flat-rate"` (or the provider key on the `ShippingOption`), `ShippingServiceCode` is looked up from the option |
| `dyn:{provider}:{serviceCode}` | `ShippingProviderKey = {provider}`, `ShippingServiceCode = {serviceCode}` |

In both cases `ShippingServiceName` is resolved from the selected option's display name and `ShippingServiceCategory` is inferred for fulfilment routing (category mapping → default provider method → raw service code fallback).

See [Shipping Overview](../shipping/shipping-overview.md) and [Dynamic Shipping Providers](../shipping/dynamic-shipping-providers.md) for the carrier-side story, and [Fulfilment Overview](../fulfilment/fulfilment-overview.md) for how these fields drive 3PL routing.

## Key Points

- Products are split into order groups by warehouse (default strategy) or vendor (pluggable).
- Each group gets its own shipping options and exactly one selection.
- Selection key format is a stable contract: `so:{guid}` (flat-rate) or `dyn:{provider}:{serviceCode}` (dynamic).
- `GetOrderGroupsParameters` requires `Basket` + `Session` — address and previous selections come from the session.
- Quoted shipping costs are preserved from selection time through to invoice — dynamic rates can move between selection and payment, the customer pays what they saw.
- Use `autoSelectShipping: true` on `/api/merchello/checkout/initialize` for single-page checkout.
- `AllowExternalCarrierShipping = false` on a product root blocks dynamic carrier options for any group containing that product.
- Flat-rate cost lookup priority: State → Country → Universal(*) → FixedCost (via `ShippingCostResolver.ResolveBaseCost()`).
