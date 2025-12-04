using Merchello.Core.Notifications.Base;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Notifications.Product;

/// <summary>
/// Notification published before a ProductRoot is created.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class ProductCreatingNotification(ProductRoot product)
    : MerchelloCancelableNotification<ProductRoot>(product)
{
    /// <summary>
    /// The product being created.
    /// </summary>
    public ProductRoot Product => Entity;
}
