namespace Merchello.Core.Developer.Dtos;

/// <summary>
/// Information about a notification handler including its priority and execution order.
/// </summary>
public record NotificationHandlerInfoDto
{
    /// <summary>
    /// The handler class name (e.g., "EmailNotificationHandler").
    /// </summary>
    public required string TypeName { get; init; }

    /// <summary>
    /// The full type name including namespace.
    /// </summary>
    public required string FullTypeName { get; init; }

    /// <summary>
    /// The assembly containing this handler, if external.
    /// </summary>
    public string? AssemblyName { get; init; }

    /// <summary>
    /// The handler priority from NotificationHandlerPriorityAttribute (default: 1000).
    /// Lower values execute first.
    /// </summary>
    public int Priority { get; init; }

    /// <summary>
    /// Human-readable priority category (Validation, Early Processing, Default, Core Processing, Business Rules, Late / External).
    /// </summary>
    public required string PriorityCategory { get; init; }

    /// <summary>
    /// The 1-based execution order within the notification's handler chain.
    /// </summary>
    public int ExecutionOrder { get; init; }

    /// <summary>
    /// Whether another handler for the same notification shares this priority value.
    /// Indicates non-deterministic execution ordering between the duplicates.
    /// </summary>
    public bool HasDuplicatePriority { get; init; }
}
