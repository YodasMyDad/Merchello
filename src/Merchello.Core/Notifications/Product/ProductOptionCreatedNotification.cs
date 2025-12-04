using Merchello.Core.Notifications.Base;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Notifications.Product;

/// <summary>
/// Notification published after a ProductOption has been created.
/// </summary>
public class ProductOptionCreatedNotification(ProductOption option, Guid productRootId) : MerchelloNotification
{
    /// <summary>
    /// The product option that was created.
    /// </summary>
    public ProductOption Option { get; } = option;

    /// <summary>
    /// The ID of the ProductRoot this option belongs to.
    /// </summary>
    public Guid ProductRootId { get; } = productRootId;
}
