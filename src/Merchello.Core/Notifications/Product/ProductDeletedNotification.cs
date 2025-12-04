using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Product;

/// <summary>
/// Notification published after a ProductRoot has been deleted.
/// </summary>
public class ProductDeletedNotification(Guid productId, string? productName) : MerchelloNotification
{
    /// <summary>
    /// The ID of the product that was deleted.
    /// </summary>
    public Guid ProductId { get; } = productId;

    /// <summary>
    /// The name of the product that was deleted (for logging/audit purposes).
    /// </summary>
    public string? ProductName { get; } = productName;
}
