# Custom Order Grouping Strategies

Order grouping strategies determine how basket items are split into separate orders during checkout. The default strategy groups items by warehouse, but you can create custom strategies to group by vendor, product category, delivery date, or any other criteria.

## Quick Overview

To create a custom order grouping strategy:

1. Create a class that implements `IOrderGroupingStrategy`
2. Implement `Metadata` and `GroupItemsAsync()`
3. Register it in `appsettings.json`

## How Order Grouping Works

During checkout, after the customer provides a shipping address, Merchello runs the order grouping strategy:

```
Customer submits shipping address
    -> CheckoutService calls the configured strategy
    -> Strategy receives OrderGroupingContext (basket, addresses, products, warehouses)
    -> Strategy returns OrderGroupingResult with one or more OrderGroups
    -> Each OrderGroup becomes a separate order with its own shipping options
```

## The Default Strategy

The built-in [`DefaultOrderGroupingStrategy`](../../../src/Merchello.Core/Checkout/Strategies/DefaultOrderGroupingStrategy.cs) (key `default-warehouse`) groups items by warehouse. It:

1. Selects the best warehouse for each product using the standard warehouse selection order: `ProductRootWarehouse` priority → service region eligibility → stock availability (`Stock - Reserved >= qty`).
2. Groups items shipping from the same warehouse together.
3. Handles multi-warehouse fulfillment (splitting a line item across warehouses).
4. Resolves flat-rate shipping costs (via `ShippingCostResolver.ResolveBaseCost()`) and fetches dynamic carrier rates (via `IShippingQuoteService`).
5. Publishes `OrderGroupingModifyingNotification` (cancelable) and `OrderGroupingNotification` (read-only).

## Creating a Vendor Grouping Strategy

Here's a complete example that groups items by vendor (from product extended data):

```csharp
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shipping.Models;

public class VendorOrderGroupingStrategy : IOrderGroupingStrategy
{
    public OrderGroupingStrategyMetadata Metadata => new(
        Key: "vendor-grouping",
        DisplayName: "Vendor Grouping",
        Description: "Groups order items by vendor for split fulfillment"
    );

    public Task<OrderGroupingResult> GroupItemsAsync(
        OrderGroupingContext context,
        CancellationToken cancellationToken = default)
    {
        // Validation: country code is required
        if (string.IsNullOrWhiteSpace(context.ShippingAddress.CountryCode))
        {
            return Task.FromResult(
                OrderGroupingResult.Fail("Country required"));
        }

        var groups = new Dictionary<string, OrderGroup>();
        var errors = new List<string>();

        foreach (var lineItem in context.Basket.LineItems.Where(li => li.ProductId.HasValue))
        {
            // Get the product
            if (!context.Products.TryGetValue(lineItem.ProductId!.Value, out var product))
            {
                errors.Add($"Product {lineItem.Name} not found");
                continue;
            }

            // Get vendor ID from product root extended data (default to "default")
            var vendorId = product.ProductRoot?.ExtendedData
                .GetValueOrDefault("VendorId")?.UnwrapJsonElement()?.ToString()
                ?? "default";

            // Create or get group for this vendor
            if (!groups.TryGetValue(vendorId, out var group))
            {
                group = new OrderGroup
                {
                    GroupId = GenerateGroupId(vendorId),
                    GroupName = $"Vendor: {vendorId}",
                    Metadata = new Dictionary<string, object>
                    {
                        ["vendorId"] = vendorId  // Identifies this as a vendor group
                    }
                };
                groups[vendorId] = group;
            }

            // Add the line item
            group.LineItems.Add(new ShippingLineItem
            {
                LineItemId = lineItem.Id,
                Name = lineItem.Name ?? "",
                Sku = lineItem.Sku,
                Quantity = lineItem.Quantity,
                Amount = lineItem.Amount
            });
        }

        if (errors.Count > 0)
        {
            return Task.FromResult(new OrderGroupingResult
            {
                Groups = [],
                Errors = errors
            });
        }

        return Task.FromResult(new OrderGroupingResult
        {
            Groups = groups.Values.ToList(),
            SubTotal = context.Basket.SubTotal,
            Tax = context.Basket.Tax,
            Total = context.Basket.Total
        });
    }

    private static Guid GenerateGroupId(string vendorId)
    {
        using var md5 = System.Security.Cryptography.MD5.Create();
        var hash = md5.ComputeHash(
            System.Text.Encoding.UTF8.GetBytes($"vendor:{vendorId}"));
        return new Guid(hash);
    }
}
```

## Registering Your Strategy

Tell Merchello to use your strategy in `appsettings.json`:

```json
{
  "Merchello": {
    "OrderGroupingStrategy": "vendor-grouping"
  }
}
```

The value must match the `Key` from your strategy's `Metadata`.

## The OrderGroupingContext

Your strategy receives everything it needs through the context object:

```csharp
public class OrderGroupingContext
{
    // The basket with all line items
    public required Basket Basket { get; init; }

    // Customer addresses
    public required Address BillingAddress { get; init; }
    public required Address ShippingAddress { get; init; }

    // Customer identity (if logged in)
    public Guid? CustomerId { get; init; }
    public string? CustomerEmail { get; init; }

    // Pre-loaded product data (avoids N+1 queries in your strategy)
    public required IReadOnlyDictionary<Guid, Product> Products { get; init; }

    // Pre-loaded warehouse data
    public required IReadOnlyDictionary<Guid, Warehouse> Warehouses { get; init; }

    // Previously selected shipping options (keyed by GroupId)
    public Dictionary<Guid, string> SelectedShippingOptions { get; init; } = [];

    // Per-line-item shipping selections (for order edit flows)
    public Dictionary<Guid, (Guid WarehouseId, string SelectionKey)> LineItemShippingSelections { get; init; } = [];

    // Custom data you can pass from the checkout
    public Dictionary<string, object> ExtendedData { get; init; } = [];
}
```

> **Tip:** Products and warehouses are pre-loaded into dictionaries to avoid N+1 queries. Always use these dictionaries rather than calling services to look up individual products.

## The OrderGroup

Each group becomes a separate order:

```csharp
public class OrderGroup
{
    // Deterministic ID (same basket should produce same GroupIds)
    public Guid GroupId { get; set; }

    // Shown to customers (e.g., "Shipment from London", "Vendor: Acme Corp")
    public string GroupName { get; set; } = "";

    // Optional warehouse (null for non-warehouse fulfillment like drop-shipping)
    public Guid? WarehouseId { get; set; }

    // Items in this group
    public List<ShippingLineItem> LineItems { get; set; } = [];

    // Available shipping options for this group
    public List<ShippingOptionInfo> AvailableShippingOptions { get; set; } = [];

    // Currently selected shipping option key
    // Format: "so:{guid}" for flat-rate, "dyn:{provider}:{serviceCode}" for dynamic
    public string? SelectedShippingOptionId { get; set; }

    // Custom metadata (e.g., vendor info, fulfillment source)
    public Dictionary<string, object> Metadata { get; set; } = [];
}
```

## The OrderGroupingResult

```csharp
public class OrderGroupingResult
{
    public List<OrderGroup> Groups { get; set; } = [];
    public List<string> Errors { get; set; } = [];
    public List<string> StockErrors { get; set; } = [];
    public bool Success => Errors.Count == 0 && Groups.Count > 0;

    public decimal SubTotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }

    // Convenience factory methods
    public static OrderGroupingResult Fail(string error) => new() { Errors = [error] };
    public static OrderGroupingResult Fail(IEnumerable<string> errors) => new() { Errors = errors.ToList() };
}
```

## Notifications

The default strategy publishes two notifications during grouping:

1. **`OrderGroupingModifyingNotification`** -- Cancelable. Handlers can modify the result or cancel grouping.
2. **`OrderGroupingNotification`** -- Read-only observation after grouping is complete.

If your custom strategy needs the same extensibility, publish these notifications yourself:

```csharp
var modifying = new OrderGroupingModifyingNotification(context, result, Metadata.Key);
if (await notificationPublisher.PublishCancelableAsync(modifying, cancellationToken))
{
    return OrderGroupingResult.Fail(modifying.CancelReason ?? "Grouping cancelled");
}

await notificationPublisher.PublishAsync(
    new OrderGroupingNotification(context, result, Metadata.Key), cancellationToken);
```

## Important Rules

1. **GroupIds must be deterministic.** The same basket and address combination should always produce the same GroupIds. This ensures shipping selections persist across requests.

2. **Validate early.** If `ShippingAddress.CountryCode` is empty, fail with `OrderGroupingResult.Fail("Country required")`.

3. **Use `UnwrapJsonElement()`** when reading values from `ExtendedData`. Dictionary values may be `JsonElement` rather than CLR types after deserialization.

4. **Never use `Task.WhenAll`** for parallel service calls. Umbraco's `EFCoreScope` uses `AsyncLocal` state that breaks with concurrent tasks.

5. **Use constructor injection only.** Strategies are activated via `ActivatorUtilities.CreateInstance`. Do not rely on setter injection, service locator calls, or post-construction configuration. See [Extension Manager](extension-manager.md).

6. **Honor the shipping selection key contract** when populating `OrderGroup.SelectedShippingOptionId`. Use `so:{guid}` for flat-rate selections and `dyn:{providerKey}:{serviceCode}` for dynamic carrier selections -- the checkout parses these into `Order.ShippingProviderKey` / `ShippingServiceCode` / `ShippingServiceName`. See [Creating Shipping Providers](creating-shipping-providers.md#shipping-selection-key-contract).
