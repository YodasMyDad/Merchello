using Merchello.Core.Notifications.Base;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Notifications.Product;

/// <summary>
/// Notification published after a ProductRoot has been created.
/// </summary>
public class ProductCreatedNotification(ProductRoot product) : MerchelloNotification
{
    /// <summary>
    /// The product that was created.
    /// </summary>
    public ProductRoot Product { get; } = product;
}
