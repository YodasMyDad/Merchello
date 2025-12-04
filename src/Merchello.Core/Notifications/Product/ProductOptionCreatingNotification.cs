using Merchello.Core.Notifications.Base;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Notifications.Product;

/// <summary>
/// Notification published before a ProductOption is created.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class ProductOptionCreatingNotification(ProductOption option, Guid productRootId)
    : MerchelloCancelableNotification<ProductOption>(option)
{
    /// <summary>
    /// The product option being created.
    /// </summary>
    public ProductOption Option => Entity;

    /// <summary>
    /// The ID of the ProductRoot this option belongs to.
    /// </summary>
    public Guid ProductRootId { get; } = productRootId;
}
