using Umbraco.Cms.Core.Notifications;

namespace Merchello.Core.Notifications.Base;

/// <summary>
/// Base class for "Before" notifications that can be cancelled but don't have a modifiable entity.
/// Use this for operations like stock reservation where you just want to allow cancellation.
/// </summary>
public abstract class MerchelloSimpleCancelableNotification : MerchelloNotification, ICancelableNotification
{
    /// <summary>
    /// Gets or sets whether the operation should be cancelled.
    /// </summary>
    public bool Cancel { get; set; }

    /// <summary>
    /// Gets the reason for cancellation, if cancelled.
    /// </summary>
    public string? CancelReason { get; private set; }

    /// <summary>
    /// Cancels the operation with the specified reason.
    /// </summary>
    /// <param name="reason">The reason for cancellation. This will be returned to the caller.</param>
    public void CancelOperation(string reason)
    {
        Cancel = true;
        CancelReason = reason;
    }
}
