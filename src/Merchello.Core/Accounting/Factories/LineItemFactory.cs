using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Accounting.Factories;

public class LineItemFactory
{
    public LineItem CreateFromProduct(Product product, int quantity)
    {
        return new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            Name = product.Name,
            Sku = product.Sku,
            Quantity = quantity,
            Amount = product.Price,
            LineItemType = LineItemType.Product,
            IsTaxable = true,
            TaxRate = product.ProductRoot.TaxGroup?.TaxPercentage ?? 20m
        };
    }

    public LineItem CreateShippingLineItem(string name, decimal amount)
    {
        return new LineItem
        {
            Id = Guid.NewGuid(),
            Name = name,
            Quantity = 1,
            Amount = amount,
            LineItemType = LineItemType.Shipping,
            IsTaxable = false
        };
    }
}

