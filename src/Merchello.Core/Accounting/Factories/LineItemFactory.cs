using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Services.Interfaces;

namespace Merchello.Core.Accounting.Factories;

public class LineItemFactory(ICurrencyService currencyService)
{
    /// <summary>
    /// Creates a line item from a product.
    /// </summary>
    public LineItem CreateFromProduct(Product product, int quantity)
    {
        var taxRate = product.ProductRoot.TaxGroup?.TaxPercentage ?? 0m;
        return new LineItem
        {
            Id = GuidExtensions.NewSequentialGuid,
            ProductId = product.Id,
            Name = product.Name,
            Sku = product.Sku,
            Quantity = quantity,
            Amount = product.Price,
            Cost = product.CostOfGoods,
            LineItemType = LineItemType.Product,
            IsTaxable = taxRate > 0,
            TaxRate = taxRate,
            TaxGroupId = product.ProductRoot.TaxGroupId
        };
    }

    /// <summary>
    /// Creates an add-on line item for a basket from a product option value.
    /// Ensures TaxGroupId is preserved and tax rate is resolved from the product's tax group.
    /// </summary>
    public LineItem CreateAddonForBasket(
        Product product,
        ProductOption option,
        ProductOptionValue value,
        string dependantLineItemSku,
        int quantity)
    {
        var taxRate = product.ProductRoot.TaxGroup?.TaxPercentage ?? 0m;
        var sku = string.IsNullOrWhiteSpace(value.SkuSuffix)
            ? $"ADDON-{value.Id.ToString()[..8]}"
            : $"{product.Sku}-{value.SkuSuffix}";

        return new LineItem
        {
            Id = GuidExtensions.NewSequentialGuid,
            Name = $"{option.Name}: {value.Name}",
            Sku = sku,
            DependantLineItemSku = dependantLineItemSku,
            Quantity = quantity,
            Amount = value.PriceAdjustment,
            LineItemType = LineItemType.Addon,
            IsTaxable = taxRate > 0,
            TaxRate = taxRate,
            TaxGroupId = product.ProductRoot.TaxGroupId,
            ExtendedData = new Dictionary<string, object>
            {
                ["AddonOptionId"] = option.Id.ToString(),
                ["AddonValueId"] = value.Id.ToString(),
                ["CostAdjustment"] = value.CostAdjustment,
                ["WeightKg"] = value.WeightKg ?? 0m
            }
        };
    }

    /// <summary>
    /// Creates a shipping line item.
    /// </summary>
    public LineItem CreateShippingLineItem(string name, decimal amount)
    {
        return new LineItem
        {
            Id = GuidExtensions.NewSequentialGuid,
            Name = name,
            Quantity = 1,
            Amount = amount,
            LineItemType = LineItemType.Shipping,
            IsTaxable = false
        };
    }

    /// <summary>
    /// Creates an order line item from a basket line item with allocated quantity and amount.
    /// Used during order creation when basket items may be split across multiple orders.
    /// </summary>
    /// <param name="basketLineItem">The source basket line item</param>
    /// <param name="allocatedQuantity">Quantity allocated to this order</param>
    /// <param name="allocatedAmount">Amount allocated to this order</param>
    /// <param name="cost">Cost of goods for this item (captured at order time for profit calculations)</param>
    public LineItem CreateForOrder(
        LineItem basketLineItem,
        int allocatedQuantity,
        decimal allocatedAmount,
        decimal cost = 0)
    {
        return new LineItem
        {
            Id = GuidExtensions.NewSequentialGuid,
            ProductId = basketLineItem.ProductId,
            Name = basketLineItem.Name,
            Sku = basketLineItem.Sku,
            Quantity = allocatedQuantity,
            Amount = allocatedAmount,
            Cost = cost,
            OriginalAmount = basketLineItem.OriginalAmount,
            LineItemType = basketLineItem.LineItemType,
            IsTaxable = basketLineItem.IsTaxable,
            TaxRate = basketLineItem.TaxRate,
            TaxGroupId = basketLineItem.TaxGroupId,
            DependantLineItemSku = basketLineItem.DependantLineItemSku,
            ExtendedData = basketLineItem.ExtendedData
        };
    }

    /// <summary>
    /// Creates an add-on line item for an order (e.g., custom/service items dependent on a product).
    /// Cost is extracted from ExtendedData["CostAdjustment"] if available.
    /// </summary>
    /// <param name="addonItem">The basket add-on line item</param>
    /// <param name="quantity">Quantity allocated to this order</param>
    /// <param name="amount">Amount in presentment currency (converted from store currency)</param>
    public LineItem CreateAddonForOrder(LineItem addonItem, int quantity, decimal amount)
    {
        // Extract cost from ExtendedData if available (stored when add-on was added to basket)
        var cost = GetDecimalFromExtendedData(addonItem.ExtendedData, "CostAdjustment");

        return new LineItem
        {
            Id = GuidExtensions.NewSequentialGuid,
            ProductId = null,
            Name = addonItem.Name,
            Sku = addonItem.Sku,
            Quantity = quantity,
            Amount = amount,
            Cost = cost,
            OriginalAmount = addonItem.OriginalAmount,
            LineItemType = addonItem.LineItemType,
            IsTaxable = addonItem.IsTaxable,
            TaxRate = addonItem.TaxRate,
            TaxGroupId = addonItem.TaxGroupId,
            DependantLineItemSku = addonItem.DependantLineItemSku,
            ExtendedData = addonItem.ExtendedData
        };
    }

    /// <summary>
    /// Creates a discount line item for an order, scaling proportionally if the product was split across orders.
    /// For multi-warehouse fulfillment, discounts are allocated proportionally to each order.
    /// </summary>
    /// <param name="discountItem">The basket discount line item</param>
    /// <param name="allocatedQuantity">Quantity allocated to this order</param>
    /// <param name="originalQuantity">Original quantity in the basket</param>
    /// <param name="convertedAmount">Discount amount already converted to presentment currency</param>
    /// <param name="currencyCode">Presentment currency code for proper rounding (e.g., JPY=0dp, BHD=3dp)</param>
    public LineItem CreateDiscountForOrder(
        LineItem discountItem,
        int allocatedQuantity,
        int originalQuantity,
        decimal convertedAmount,
        string currencyCode)
    {
        // Scale discount amount proportionally if quantity was split
        // e.g., if 10 items with £5 discount split 6/4 → £3/£2 discount per order
        var scaleFactor = originalQuantity > 0 ? (decimal)allocatedQuantity / originalQuantity : 1m;
        var scaledAmount = currencyService.Round(convertedAmount * scaleFactor, currencyCode);

        return new LineItem
        {
            Id = GuidExtensions.NewSequentialGuid,
            ProductId = null,
            Name = discountItem.Name,
            Sku = discountItem.Sku,
            Quantity = 1, // Discounts are always qty 1, amount is the discount value
            Amount = scaledAmount,
            OriginalAmount = discountItem.OriginalAmount,
            LineItemType = LineItemType.Discount,
            IsTaxable = false, // Discounts are not taxable
            TaxRate = 0,
            DependantLineItemSku = discountItem.DependantLineItemSku,
            ExtendedData = discountItem.ExtendedData // Preserves DiscountId, DiscountCode, etc.
        };
    }

    /// <summary>
    /// Creates a line item copy for a shipment with an adjusted quantity.
    /// Used when creating partial shipments from order line items.
    /// </summary>
    /// <param name="source">The source order line item to copy</param>
    /// <param name="quantity">Quantity being shipped (may differ from source for partial shipments)</param>
    public LineItem CreateForShipment(LineItem source, int quantity)
    {
        return new LineItem
        {
            Id = GuidExtensions.NewSequentialGuid,
            ProductId = source.ProductId,
            Name = source.Name,
            Sku = source.Sku,
            Quantity = quantity,
            Amount = source.Amount,
            OriginalAmount = source.OriginalAmount,
            LineItemType = source.LineItemType,
            IsTaxable = source.IsTaxable,
            TaxRate = source.TaxRate,
            DependantLineItemSku = source.DependantLineItemSku,
            ExtendedData = source.ExtendedData
        };
    }

    /// <summary>
    /// Creates a discount line item. Amount should be negative (representing a reduction).
    /// </summary>
    public LineItem CreateDiscountLineItem(
        string name,
        string sku,
        decimal amount,
        string? dependantLineItemSku = null,
        Guid? orderId = null,
        Dictionary<string, object>? extendedData = null)
    {
        return new LineItem
        {
            Id = GuidExtensions.NewSequentialGuid,
            OrderId = orderId,
            LineItemType = LineItemType.Discount,
            DependantLineItemSku = dependantLineItemSku,
            Name = name,
            Sku = sku,
            Amount = amount,
            Quantity = 1,
            IsTaxable = false,
            TaxRate = 0,
            ExtendedData = extendedData ?? []
        };
    }

    /// <summary>
    /// Creates a lightweight line item reference for shipment tracking.
    /// Preserves the source line item's Id for correlation.
    /// </summary>
    public static LineItem CreateShipmentTrackingLineItem(LineItem source, int quantity)
    {
        return new LineItem
        {
            Id = source.Id,
            Sku = source.Sku,
            Name = source.Name,
            Quantity = quantity,
            Amount = source.Amount,
            LineItemType = source.LineItemType
        };
    }

    /// <summary>
    /// Creates a custom line item for draft/manual orders.
    /// </summary>
    public static LineItem CreateCustomLineItem(
        Guid orderId,
        string name,
        string sku,
        decimal amount,
        decimal cost,
        int quantity,
        bool isTaxable,
        decimal taxRate,
        Dictionary<string, object>? extendedData = null)
    {
        return new LineItem
        {
            Id = GuidExtensions.NewSequentialGuid,
            OrderId = orderId,
            LineItemType = LineItemType.Custom,
            Name = name,
            Sku = sku,
            Amount = amount,
            Cost = cost,
            Quantity = quantity,
            IsTaxable = isTaxable,
            TaxRate = taxRate,
            ExtendedData = extendedData ?? []
        };
    }

    /// <summary>
    /// Creates a virtual line item for basket simulation during order edit preview.
    /// </summary>
    public static LineItem CreateVirtualForPreview(
        Guid productId,
        string name,
        string sku,
        int quantity,
        decimal unitPrice)
    {
        return new LineItem
        {
            Id = productId, // Use ProductId as the identifier for virtual items
            ProductId = productId,
            Name = name,
            Sku = sku,
            Quantity = quantity,
            Amount = unitPrice * quantity
        };
    }

    /// <summary>
    /// Creates a product line item for an order edit operation.
    /// </summary>
    public static LineItem CreateProductForOrderEdit(
        Guid orderId,
        Product product,
        int quantity,
        bool isTaxable,
        decimal taxRate,
        Dictionary<string, object>? extendedData = null)
    {
        return new LineItem
        {
            Id = GuidExtensions.NewSequentialGuid,
            OrderId = orderId,
            LineItemType = LineItemType.Product,
            ProductId = product.Id,
            Name = product.Name ?? product.ProductRoot?.RootName ?? "Unknown Product",
            Sku = product.Sku ?? $"PROD-{product.Id:N}"[..20],
            Amount = product.Price,
            OriginalAmount = product.Price,
            Quantity = quantity,
            IsTaxable = isTaxable,
            TaxRate = taxRate,
            ExtendedData = extendedData ?? []
        };
    }

    /// <summary>
    /// Creates an addon line item for an order edit operation.
    /// </summary>
    public static LineItem CreateAddonForOrderEdit(
        Guid orderId,
        string parentSku,
        string name,
        string sku,
        decimal priceAdjustment,
        int quantity,
        bool isTaxable,
        decimal taxRate,
        Dictionary<string, object>? extendedData = null)
    {
        return new LineItem
        {
            Id = GuidExtensions.NewSequentialGuid,
            OrderId = orderId,
            LineItemType = LineItemType.Addon,
            DependantLineItemSku = parentSku,
            Name = name,
            Sku = sku,
            Amount = priceAdjustment,
            Quantity = quantity,
            IsTaxable = isTaxable,
            TaxRate = taxRate,
            ExtendedData = extendedData ?? []
        };
    }

    /// <summary>
    /// Safely extracts a decimal value from ExtendedData, handling JSON deserialization edge cases.
    /// </summary>
    private static decimal GetDecimalFromExtendedData(Dictionary<string, object> extendedData, string key)
    {
        if (!extendedData.TryGetValue(key, out var value))
        {
            return 0m;
        }

        // Handle JsonElement (from JSON deserialization)
        if (value is System.Text.Json.JsonElement jsonElement)
        {
            return jsonElement.ValueKind == System.Text.Json.JsonValueKind.Number
                ? jsonElement.GetDecimal()
                : 0m;
        }

        // Handle direct decimal or numeric types
        try
        {
            return Convert.ToDecimal(value);
        }
        catch
        {
            return 0m;
        }
    }
}

