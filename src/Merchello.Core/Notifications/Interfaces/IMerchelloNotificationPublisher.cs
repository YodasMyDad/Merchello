using Umbraco.Cms.Core.Notifications;

namespace Merchello.Core.Notifications.Interfaces;

/// <summary>
/// Publishes Merchello notifications to registered handlers with priority-based execution order.
/// </summary>
public interface IMerchelloNotificationPublisher
{
    /// <summary>
    /// Publishes a notification to all registered handlers.
    /// Handlers are executed in priority order (lower priority values first).
    /// </summary>
    /// <typeparam name="TNotification">The type of notification.</typeparam>
    /// <param name="notification">The notification to publish.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    Task PublishAsync<TNotification>(TNotification notification, CancellationToken cancellationToken = default)
        where TNotification : INotification;

    /// <summary>
    /// Publishes a cancelable notification to all registered handlers.
    /// Handlers are executed in priority order (lower priority values first).
    /// If any handler cancels the notification, execution stops and true is returned.
    /// </summary>
    /// <typeparam name="TNotification">The type of cancelable notification.</typeparam>
    /// <param name="notification">The notification to publish.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>True if the operation was cancelled by a handler; otherwise false.</returns>
    Task<bool> PublishCancelableAsync<TNotification>(TNotification notification, CancellationToken cancellationToken = default)
        where TNotification : ICancelableNotification;
}
