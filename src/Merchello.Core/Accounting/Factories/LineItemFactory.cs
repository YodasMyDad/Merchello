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
}

