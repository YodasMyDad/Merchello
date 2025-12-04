namespace Merchello.Core.Notifications;

/// <summary>
/// Specifies the execution priority for a notification handler.
/// Handlers with lower priority values execute first.
/// </summary>
/// <remarks>
/// Default priority is 1000. Use lower values (e.g., 100) for handlers that should run early
/// (such as validation), and higher values (e.g., 2000) for handlers that should run late
/// (such as external system synchronization).
/// </remarks>
/// <example>
/// [NotificationHandlerPriority(100)] // Runs early - validation
/// public class ValidateOrderHandler : INotificationAsyncHandler&lt;OrderSavingNotification&gt;
///
/// [NotificationHandlerPriority(2000)] // Runs late - external sync
/// public class SyncToErpHandler : INotificationAsyncHandler&lt;OrderSavedNotification&gt;
/// </example>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = false)]
public class NotificationHandlerPriorityAttribute(int priority = 1000) : Attribute
{
    /// <summary>
    /// Gets the priority value. Lower values execute first.
    /// </summary>
    public int Priority { get; } = priority;

    /// <summary>
    /// Default priority value (1000).
    /// </summary>
    public const int DefaultPriority = 1000;
}
