using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;
using BasketModel = Merchello.Core.Checkout.Models.Basket;
using ProductModel = Merchello.Core.Products.Models.Product;

namespace Merchello.Core.Notifications.BasketNotifications;

/// <summary>
/// Notification published after an item has been added to a basket.
/// </summary>
public class BasketItemAddedNotification(
    BasketModel basket,
    LineItem lineItem,
    ProductModel product,
    int quantity) : MerchelloNotification
{
    /// <summary>
    /// Gets the basket the item was added to.
    /// </summary>
    public BasketModel Basket { get; } = basket;

    /// <summary>
    /// Gets the line item that was added.
    /// </summary>
    public LineItem Item { get; } = lineItem;

    /// <summary>
    /// Gets the product that was added.
    /// </summary>
    public ProductModel Product { get; } = product;

    /// <summary>
    /// Gets the quantity that was added.
    /// </summary>
    public int Quantity { get; } = quantity;
}
