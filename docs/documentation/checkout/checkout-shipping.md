# Checkout Shipping Selection

During checkout, the customer selects a shipping method for each order group. This guide covers order grouping, the difference between flat-rate and dynamic shipping, and how selections are saved.

## Order Grouping

When a basket contains products from multiple warehouses, those products are split into **order groups**. Each group gets its own shipping options and selection.

The default strategy groups by warehouse. A vendor-grouping strategy is also available:

```json
{
    "Merchello:OrderGroupingStrategy": "vendor-grouping"
}
```

Custom grouping strategies can be registered through `ExtensionManager` via the `IOrderGroupingStrategy` interface.

### Getting Order Groups

```csharp
var result = await checkoutService.GetOrderGroupsAsync(
    new GetOrderGroupsParameters
    {
        Basket = basket,
        CountryCode = "GB",
        RegionCode = null
    },
    cancellationToken);

if (result.Success)
{
    foreach (var group in result.Groups)
    {
        // group.GroupId                    -- unique identifier
        // group.GroupName                  -- display name (e.g. warehouse name)
        // group.WarehouseId               -- which warehouse fulfils this group
        // group.LineItems                  -- basket items in this group
        // group.AvailableShippingOptions   -- shipping methods for this group
    }
}
```

## Flat-Rate vs Dynamic Shipping

### Flat-Rate Shipping

Flat-rate providers use pre-configured rates based on destination. Rates are looked up by priority:

```
State -> Country -> Universal(*) -> FixedCost
```

Selection key format: `so:{guid}` where the GUID is the shipping option ID.

### Dynamic Shipping

Dynamic providers (carriers like FedEx, UPS) fetch live rates from the carrier API.

Selection key format: `dyn:{provider}:{serviceCode}` (e.g. `dyn:fedex:FEDEX_GROUND`).

Key differences from flat-rate:
- Rates are fetched live from the carrier -- no fixed-cost entries.
- Visibility depends on provider enablement and warehouse configuration.
- Can be blocked per product using `ProductRoot.AllowExternalCarrierShipping = false`.

## Making a Shipping Selection

### Via the Checkout Service

```csharp
var result = await checkoutService.SaveShippingSelectionsAsync(
    new SaveShippingSelectionsParameters
    {
        Basket = basket,
        Selections = new Dictionary<Guid, string>
        {
            [group1Id] = "so:flat-rate-option-guid",
            [group2Id] = "dyn:fedex:FEDEX_GROUND"
        }
    },
    cancellationToken);
```

This validates all groups have a selection, captures quoted costs, updates basket totals, and refreshes any shipping-dependent discounts.

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

When the order is created, selection keys are parsed into order fields:

| Key Format | Order Fields |
|------------|-------------|
| `so:{guid}` | `ShippingProviderKey = guid` |
| `dyn:{provider}:{serviceCode}` | `ShippingProviderKey = provider`, `ShippingServiceCode = serviceCode` |

The `ShippingServiceName` is resolved from the selected option's display name.

## Key Points

- Products are split into order groups by warehouse (or vendor, if configured).
- Each group gets its own shipping options and selection.
- Selection key format: `so:{guid}` (flat-rate) or `dyn:{provider}:{serviceCode}` (dynamic).
- Quoted shipping costs are preserved from selection time through to order creation.
- Use `autoSelectShipping: true` in the initialize endpoint for single-page checkout.
- `AllowExternalCarrierShipping = false` on a product root blocks dynamic carrier options.
- Flat-rate cost lookup priority: State -> Country -> Universal(*) -> FixedCost.
