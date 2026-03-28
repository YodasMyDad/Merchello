# Checkout Shipping Selection

During checkout, the customer selects a shipping method for each warehouse group. This guide covers how order grouping works, the difference between flat-rate and dynamic shipping, and the selection key format.

## Order Grouping

When a customer's basket contains products from multiple warehouses, those products are split into **order groups**. Each group gets its own shipping options and shipping selection.

### How It Works

Order grouping is handled by `ICheckoutService.GetOrderGroupsAsync`, which uses the configured `IOrderGroupingStrategy`:

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
        // group.GroupId        -- unique identifier for this group
        // group.GroupName      -- display name (e.g. warehouse name)
        // group.WarehouseId    -- which warehouse fulfils this group
        // group.LineItems      -- the basket items in this group
        // group.AvailableShippingOptions -- shipping methods for this group
    }
}
```

### Grouping Strategies

The default strategy groups by warehouse. A vendor-grouping strategy is also available:

```json
{
    "Merchello:OrderGroupingStrategy": "vendor-grouping"
}
```

The grouping strategy is pluggable via `IOrderGroupingStrategy` and registered through `ExtensionManager`.

### Order Grouping Context

The strategy receives an `OrderGroupingContext` containing:
- `Basket`, `BillingAddress`, `ShippingAddress`
- `CustomerId`, `CustomerEmail`
- `Products`, `Warehouses`
- `SelectedShippingOptions`, `ExtendedData`

## Flat-Rate vs Dynamic Shipping

### Flat-Rate Shipping

Flat-rate providers use pre-configured rates based on destination. Rates are looked up by priority:

```
State -> Country -> Universal(*) -> FixedCost
```

Selection key format: `so:{guid}` where the GUID is the shipping option ID.

### Dynamic Shipping

Dynamic providers (carriers like FedEx, UPS) fetch live rates from the carrier API. They are identified by `UsesLiveRates = true`.

Selection key format: `dyn:{provider}:{serviceCode}` (e.g. `dyn:fedex:FEDEX_GROUND`).

Dynamic providers:
- Must NOT rely on fixed-cost entries -- they fetch rates live.
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
            // Key: GroupId, Value: SelectionKey
            [group1Id] = "so:flat-rate-option-guid",
            [group2Id] = "dyn:fedex:FEDEX_GROUND"
        }
    },
    cancellationToken);
```

This method:
1. Validates that all groups have a selection.
2. Saves selections to the checkout session.
3. Captures quoted shipping costs at the time of selection.
4. Updates basket totals with the selected shipping costs.
5. Refreshes automatic discounts (some are shipping-dependent).
6. Persists the updated basket.

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

## Selection Validation

The `ICheckoutValidator` validates shipping selections before they are saved:

```csharp
var errors = checkoutValidator.ValidateShippingSelections(groups, selections);

if (errors.Count > 0)
{
    // errors is Dictionary<string, string>
    // Key: group ID, Value: error message
}
```

Validation checks:
- Every order group has a selection.
- The selected option is available for that group.
- Multi-fallback key matching: GroupId first, then WarehouseId, then available options search.

### Key Augmentation

Shipping selections are augmented with both GroupId and WarehouseId keys for stable lookups. This handles the case where GroupId changes between pre-selection and post-selection states:

```csharp
var augmented = checkoutValidator.AugmentShippingSelections(groups, selections);
```

## Quoted Shipping Costs

When a shipping method is selected, the quoted cost is captured and stored in the checkout session. This quoted rate is honoured through to order creation, even if the provider's live rates change between selection and payment.

This is important for dynamic providers where rates can fluctuate. The customer pays the rate they were shown, not whatever the carrier returns at invoice creation time.

## Estimated Shipping (Pre-Checkout)

On the basket page, before the customer enters checkout, you can show an estimated shipping cost:

```javascript
const response = await fetch(
    '/api/merchello/storefront/basket/estimated-shipping?countryCode=GB'
);
const data = await response.json();
// data.combinedShippingTotal, data.formattedCombinedShippingTotal
```

This auto-selects the cheapest shipping option per warehouse group and returns the combined total. It does not save anything to the checkout session.

## Delivery Date Selection

Some shipping options support delivery date selection. When available, the customer can choose a preferred delivery date, which is stored per group:

```csharp
session.SelectedDeliveryDates[groupId] = requestedDeliveryDate;
```

## How Selection Keys Map to Orders

When the order is created from the checkout, selection keys are parsed into order fields:

| Key Part | Order Field |
|----------|-------------|
| `so:{guid}` | `ShippingProviderKey = guid` |
| `dyn:{provider}:{serviceCode}` | `ShippingProviderKey = provider`, `ShippingServiceCode = serviceCode` |

The `ShippingServiceName` is resolved from the selected option's display name.

## Key Points

- Products are split into order groups by warehouse (or vendor, if configured).
- Each group gets its own shipping options and selection.
- Selection key format: `so:{guid}` (flat-rate) or `dyn:{provider}:{serviceCode}` (dynamic).
- Quoted shipping costs are preserved from selection time through to order creation.
- Use `autoSelectShipping: true` in the initialize endpoint for single-page checkout.
- `AllowExternalCarrierShipping = false` on a product root blocks dynamic carrier options for those products.
- Flat-rate cost lookup priority: State -> Country -> Universal(*) -> FixedCost.
