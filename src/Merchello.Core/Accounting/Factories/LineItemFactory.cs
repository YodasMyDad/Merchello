using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Accounting.Factories;

public class LineItemFactory
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
            LineItemType = LineItemType.Product,
            IsTaxable = taxRate > 0,
            TaxRate = taxRate
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
    public LineItem CreateForOrder(
        LineItem basketLineItem,
        int allocatedQuantity,
        decimal allocatedAmount)
    {
        return new LineItem
        {
            Id = GuidExtensions.NewSequentialGuid,
            ProductId = basketLineItem.ProductId,
            Name = basketLineItem.Name,
            Sku = basketLineItem.Sku,
            Quantity = allocatedQuantity,
            Amount = allocatedAmount,
            OriginalAmount = basketLineItem.OriginalAmount,
            LineItemType = basketLineItem.LineItemType,
            IsTaxable = basketLineItem.IsTaxable,
            TaxRate = basketLineItem.TaxRate,
            DependantLineItemSku = basketLineItem.DependantLineItemSku,
            ExtendedData = basketLineItem.ExtendedData
        };
    }

    /// <summary>
    /// Creates an add-on line item for an order (e.g., custom/service items dependent on a product).
    /// </summary>
    public LineItem CreateAddonForOrder(LineItem addonItem, int quantity)
    {
        return new LineItem
        {
            Id = GuidExtensions.NewSequentialGuid,
            ProductId = null,
            Name = addonItem.Name,
            Sku = addonItem.Sku,
            Quantity = quantity,
            Amount = addonItem.Amount,
            OriginalAmount = addonItem.OriginalAmount,
            LineItemType = addonItem.LineItemType,
            IsTaxable = addonItem.IsTaxable,
            TaxRate = addonItem.TaxRate,
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
    public LineItem CreateDiscountForOrder(LineItem discountItem, int allocatedQuantity, int originalQuantity)
    {
        // Scale discount amount proportionally if quantity was split
        // e.g., if 10 items with £5 discount split 6/4 → £3/£2 discount per order
        var scaleFactor = originalQuantity > 0 ? (decimal)allocatedQuantity / originalQuantity : 1m;
        var scaledAmount = Math.Round(discountItem.Amount * scaleFactor, 2);

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
}

