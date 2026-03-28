# Order Grouping Strategies

When a customer checks out, Merchello needs to figure out *how* to split their basket into separate orders. If you have multiple warehouses, or products from different vendors, a single basket might result in two or three separate shipments. That is what the **order grouping strategy** does -- it takes a basket and produces one or more **OrderGroups**, each of which becomes its own order.

## How It Works

During checkout, `IShippingService.GetShippingOptionsForBasket()` is called. Internally this builds an `OrderGroupingContext` and passes it to the active grouping strategy. The strategy returns an `OrderGroupingResult` containing the groups, available shipping options per group, and any errors.

```
Basket --> OrderGroupingContext --> IOrderGroupingStrategy --> OrderGroupingResult
                                                                  |
                                                           List<OrderGroup>
```

Each `OrderGroup` contains:

- **GroupId** -- a deterministic GUID based on warehouse + shipping options (stable across requests)
- **GroupName** -- display name shown to the customer (e.g., "Shipment from London")
- **WarehouseId** -- the warehouse fulfilling this group
- **LineItems** -- the basket items allocated to this group
- **AvailableShippingOptions** -- flat-rate and dynamic carrier options available
- **SelectedShippingOptionId** -- the customer's chosen shipping method (if selected)
- **Metadata** -- extensible dictionary for custom data (vendor ID, etc.)

## The Default Strategy: Warehouse Grouping

Out of the box, Merchello uses `DefaultOrderGroupingStrategy` (key: `"default-warehouse"`). It groups items by warehouse based on stock availability and shipping region.

### What it does step by step

1. **Validates** the shipping address has a country code (fails fast if missing).
2. **Iterates** each basket line item that has a `ProductId`.
3. **Skips** digital products (they don't need shipping groups).
4. **Selects a warehouse** using `WarehouseService.SelectWarehouseForProduct()`, which follows this priority:
   - `ProductRootWarehouse` priority settings
   - Service region eligibility for the shipping address
   - Stock availability (`Stock - Reserved >= quantity`)
5. **Handles multi-warehouse splits** -- if no single warehouse has enough stock, the item is split across multiple warehouses with proportional amounts.
6. **Groups items** by warehouse + compatible shipping options.
7. **Resolves flat-rate costs** using grouped package weights (so weight tiers apply correctly).
8. **Fetches dynamic carrier rates** (FedEx, UPS, etc.) for each group.
9. **Publishes notifications** so handlers can modify or observe the result.

### Multi-warehouse fulfillment

If a customer orders 10 units of a product but Warehouse A only has 6 in stock and Warehouse B has 4, the strategy splits the line item across two groups:

```
Group 1 (Warehouse A): 6 units, proportional amount
Group 2 (Warehouse B): 4 units, proportional amount
```

The proportional amount is calculated as: `(lineItem.Amount / lineItem.Quantity) * allocatedQuantity`.

## Shipping Selection Keys

When a customer selects a shipping method, the selection is stored as a **selection key** with a stable contract:

| Type | Format | Example |
|------|--------|---------|
| Flat-rate | `so:{shippingOptionGuid}` | `so:a1b2c3d4-...` |
| Dynamic carrier | `dyn:{provider}:{serviceCode}` | `dyn:fedex:FEDEX_GROUND` |

These keys are parsed into order fields (`ShippingProviderKey`, `ShippingServiceCode`, `ShippingServiceName`) when the order is created.

## Digital Products

Products where `ProductRoot.IsDigitalProduct = true` are automatically excluded from order grouping. They don't need warehouse assignment or shipping options.

## External Carrier Restrictions

If `ProductRoot.AllowExternalCarrierShipping = false`, dynamic carrier options (FedEx, UPS, etc.) are blocked for groups containing that product. Only flat-rate shipping options will appear.

## Configuring a Different Strategy

You can swap the grouping strategy via configuration:

```json
{
  "Merchello": {
    "OrderGroupingStrategy": "vendor-grouping"
  }
}
```

The resolver matches by strategy **key** first, then by fully qualified type name.

## Building a Custom Strategy

To create your own grouping strategy:

1. Implement `IOrderGroupingStrategy`.
2. Register it with DI (Merchello's `ExtensionManager` discovers implementations automatically).

```csharp
public class VendorGroupingStrategy : IOrderGroupingStrategy
{
    public OrderGroupingStrategyMetadata Metadata => new(
        Key: "vendor-grouping",
        DisplayName: "Vendor Grouping",
        Description: "Groups order items by vendor/supplier.");

    public async Task<OrderGroupingResult> GroupItemsAsync(
        OrderGroupingContext context,
        CancellationToken cancellationToken = default)
    {
        // Validate country code is present
        if (string.IsNullOrWhiteSpace(context.ShippingAddress.CountryCode))
        {
            return OrderGroupingResult.Fail("Country required");
        }

        // Group by vendor ID from product root extended data
        var groups = new List<OrderGroup>();

        foreach (var lineItem in context.Basket.LineItems.Where(li => li.ProductId.HasValue))
        {
            if (!context.Products.TryGetValue(lineItem.ProductId!.Value, out var product))
                continue;

            var vendorId = product.ProductRoot?.ExtendedData
                .GetValueOrDefault("VendorId")?.ToString() ?? "default";

            // Find or create group for this vendor
            var group = groups.FirstOrDefault(g =>
                g.Metadata.GetValueOrDefault("VendorId")?.ToString() == vendorId);

            if (group == null)
            {
                group = new OrderGroup
                {
                    GroupId = Guid.NewGuid(),
                    GroupName = $"Vendor: {vendorId}",
                    Metadata = new() { ["VendorId"] = vendorId }
                };
                groups.Add(group);
            }

            group.LineItems.Add(new ShippingLineItem
            {
                LineItemId = lineItem.Id,
                Name = lineItem.Name ?? string.Empty,
                Sku = lineItem.Sku,
                Quantity = lineItem.Quantity,
                Amount = lineItem.Amount
            });
        }

        return new OrderGroupingResult
        {
            Groups = groups,
            SubTotal = context.Basket.SubTotal,
            Tax = context.Basket.Tax,
            Total = context.Basket.Total
        };
    }
}
```

## The OrderGroupingContext

Your strategy receives an `OrderGroupingContext` with everything you need:

| Property | Description |
|----------|-------------|
| `Basket` | The basket with line items to group |
| `BillingAddress` | Customer's billing address |
| `ShippingAddress` | Customer's shipping address |
| `CustomerId` | Logged-in customer ID (if any) |
| `CustomerEmail` | Customer's email |
| `Products` | Dictionary of products keyed by ProductId (preloaded, no N+1) |
| `Warehouses` | Dictionary of warehouses keyed by WarehouseId (preloaded) |
| `SelectedShippingOptions` | Previously selected shipping per group |
| `LineItemShippingSelections` | Per-line-item shipping selections (order edit flow) |
| `ExtendedData` | Custom data for your strategy |

## Notifications

The default strategy publishes two notifications you can hook into:

- **`OrderGroupingModifyingNotification`** -- cancelable; handlers can modify the result or cancel grouping entirely.
- **`OrderGroupingNotification`** -- read-only; fired after grouping completes for observation/logging.

> **Tip:** Use `OrderGroupingModifyingNotification` to add surcharges, modify group names, or enforce business rules before the customer sees shipping options.
