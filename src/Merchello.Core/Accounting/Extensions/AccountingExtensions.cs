using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Accounting.Extensions;

public static class AccountingExtensions
{
    /// <summary>
    /// Converts a product into a line item
    /// </summary>
    /// <param name="product"></param>
    /// <param name="qty"></param>
    /// <returns></returns>
    public static LineItem ToLineItem(this Product product, int qty)
    {
        return new LineItem
        {
            ProductId = product.Id,
            Id = new Guid(),
            Name = product.Name,
            Amount = product.Price,
            Quantity = qty,
            Sku = product.Sku
        };
    }

    /// <summary>
    /// Validates a line item being added
    /// </summary>
    /// <param name="newLineItem"></param>
    /// <returns></returns>
    public static List<string> ValidateLineItem(this LineItem newLineItem)
    {
        List<string> list = [];
        if (string.IsNullOrWhiteSpace(newLineItem.Sku))
        {
            list.Add("Missing SKU");
        }

        if (newLineItem.Quantity <= 0)
        {
            list.Add("Quantity is less than or equal to zero");
        }

        return list;
    }
}
