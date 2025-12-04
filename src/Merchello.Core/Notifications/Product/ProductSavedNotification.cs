using Merchello.Core.Notifications.Base;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Notifications.Product;

/// <summary>
/// Notification published after a ProductRoot has been saved/updated.
/// </summary>
public class ProductSavedNotification(ProductRoot product) : MerchelloNotification
{
    /// <summary>
    /// The product that was saved.
    /// </summary>
    public ProductRoot Product { get; } = product;
}
