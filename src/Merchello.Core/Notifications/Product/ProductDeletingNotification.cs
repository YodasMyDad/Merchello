using Merchello.Core.Notifications.Base;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Notifications.Product;

/// <summary>
/// Notification published before a ProductRoot is deleted.
/// Handlers can cancel the operation.
/// </summary>
public class ProductDeletingNotification(ProductRoot product)
    : MerchelloCancelableNotification<ProductRoot>(product)
{
    /// <summary>
    /// The product being deleted.
    /// </summary>
    public ProductRoot Product => Entity;
}
