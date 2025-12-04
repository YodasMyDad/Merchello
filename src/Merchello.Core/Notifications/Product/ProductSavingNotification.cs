using Merchello.Core.Notifications.Base;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Notifications.Product;

/// <summary>
/// Notification published before a ProductRoot is saved/updated.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class ProductSavingNotification(ProductRoot product)
    : MerchelloCancelableNotification<ProductRoot>(product)
{
    /// <summary>
    /// The product being saved.
    /// </summary>
    public ProductRoot Product => Entity;
}
