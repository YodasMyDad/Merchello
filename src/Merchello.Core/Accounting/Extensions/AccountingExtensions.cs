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

    /// <summary>
    /// Gets the overall fulfillment status for a collection of orders.
    /// </summary>
    public static string GetFulfillmentStatus(this IEnumerable<Order> orders)
    {
        var orderList = orders.ToList();
        if (!orderList.Any())
            return Constants.StatusLabels.Fulfillment.Unfulfilled;

        var allShipped = orderList.All(o => o.Status == OrderStatus.Shipped || o.Status == OrderStatus.Completed);
        if (allShipped)
            return Constants.StatusLabels.Fulfillment.Fulfilled;

        var anyShipped = orderList.Any(o =>
            o.Status == OrderStatus.Shipped ||
            o.Status == OrderStatus.PartiallyShipped ||
            o.Status == OrderStatus.Completed);

        return anyShipped ? Constants.StatusLabels.Fulfillment.Partial : Constants.StatusLabels.Fulfillment.Unfulfilled;
    }

    /// <summary>
    /// Gets the CSS class for the fulfillment status badge.
    /// </summary>
    public static string GetFulfillmentStatusCssClass(this IEnumerable<Order> orders)
    {
        var status = orders.GetFulfillmentStatus();
        return status switch
        {
            Constants.StatusLabels.Fulfillment.Fulfilled => Constants.StatusLabels.CssClasses.Positive,
            Constants.StatusLabels.Fulfillment.Partial => Constants.StatusLabels.CssClasses.Warning,
            _ => Constants.StatusLabels.CssClasses.Default
        };
    }
}
