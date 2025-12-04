using Umbraco.Cms.Core.Notifications;

namespace Merchello.Core.Notifications.Base;

/// <summary>
/// Base class for "Before" notifications that can be cancelled and allow entity modification.
/// Handlers can modify the entity before save or cancel the operation entirely.
/// </summary>
/// <typeparam name="TEntity">The type of entity being operated on.</typeparam>
public abstract class MerchelloCancelableNotification<TEntity> : MerchelloNotification, ICancelableNotification
    where TEntity : class
{
    protected MerchelloCancelableNotification(TEntity entity)
    {
        Entity = entity;
    }

    /// <summary>
    /// Gets the entity being operated on. Handlers can modify this entity before save.
    /// </summary>
    public TEntity Entity { get; }

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
