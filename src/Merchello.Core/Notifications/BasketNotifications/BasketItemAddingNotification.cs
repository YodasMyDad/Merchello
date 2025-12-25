using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;
using BasketModel = Merchello.Core.Checkout.Models.Basket;
using ProductModel = Merchello.Core.Products.Models.Product;

namespace Merchello.Core.Notifications.BasketNotifications;

/// <summary>
/// Notification published before an item is added to a basket.
/// Handlers can modify the line item or cancel the operation.
/// </summary>
public class BasketItemAddingNotification : MerchelloCancelableNotification<LineItem>
{
    public BasketItemAddingNotification(
        BasketModel basket,
        LineItem lineItem,
        ProductModel product,
        int quantity) : base(lineItem)
    {
        Basket = basket;
        Product = product;
        Quantity = quantity;
    }

    /// <summary>
    /// Gets the basket the item is being added to.
    /// </summary>
    public BasketModel Basket { get; }

    /// <summary>
    /// Gets the line item being added.
    /// </summary>
    public LineItem Item => Entity;

    /// <summary>
    /// Gets the product being added.
    /// </summary>
    public ProductModel Product { get; }

    /// <summary>
    /// Gets the quantity being added.
    /// </summary>
    public int Quantity { get; }
}
