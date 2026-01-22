namespace Merchello.Core.Developer.Dtos;

/// <summary>
/// Information about a notification type and its registered handlers.
/// </summary>
public record NotificationInfoDto
{
    /// <summary>
    /// The notification class name (e.g., "OrderCreatedNotification").
    /// </summary>
    public required string TypeName { get; init; }

    /// <summary>
    /// The full type name including namespace.
    /// </summary>
    public required string FullTypeName { get; init; }

    /// <summary>
    /// The domain/category this notification belongs to (e.g., "Order", "Payment").
    /// </summary>
    public required string Domain { get; init; }

    /// <summary>
    /// Whether this notification can be cancelled by handlers.
    /// </summary>
    public bool IsCancelable { get; init; }

    /// <summary>
    /// The registered handlers for this notification, sorted by execution order.
    /// </summary>
    public List<NotificationHandlerInfoDto> Handlers { get; init; } = [];

    /// <summary>
    /// Whether any handlers are registered for this notification.
    /// </summary>
    public bool HasHandlers { get; init; }
}
