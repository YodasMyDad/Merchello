using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Product;

/// <summary>
/// Notification published after a ProductOption has been deleted.
/// </summary>
public class ProductOptionDeletedNotification(Guid optionId, string optionName, Guid productRootId) : MerchelloNotification
{
    /// <summary>
    /// The ID of the option that was deleted.
    /// </summary>
    public Guid OptionId { get; } = optionId;

    /// <summary>
    /// The name of the option that was deleted.
    /// </summary>
    public string OptionName { get; } = optionName;

    /// <summary>
    /// The ID of the ProductRoot this option belonged to.
    /// </summary>
    public Guid ProductRootId { get; } = productRootId;
}
