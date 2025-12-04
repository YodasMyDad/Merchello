namespace Merchello.Core.Notifications.Aggregate;

/// <summary>
/// The type of change that occurred to an entity within the Invoice aggregate.
/// </summary>
public enum AggregateChangeType
{
    /// <summary>
    /// A new entity was created.
    /// </summary>
    Created,

    /// <summary>
    /// An existing entity was updated.
    /// </summary>
    Updated,

    /// <summary>
    /// An entity was deleted.
    /// </summary>
    Deleted
}
