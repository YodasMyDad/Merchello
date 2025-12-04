using Merchello.Core.Notifications.Base;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Notifications.Product;

/// <summary>
/// Notification published before a ProductOption is deleted.
/// Handlers can cancel the operation.
/// </summary>
public class ProductOptionDeletingNotification(ProductOption option, Guid productRootId)
    : MerchelloCancelableNotification<ProductOption>(option)
{
    /// <summary>
    /// The product option being deleted.
    /// </summary>
    public ProductOption Option => Entity;

    /// <summary>
    /// The ID of the ProductRoot this option belongs to.
    /// </summary>
    public Guid ProductRootId { get; } = productRootId;
}
