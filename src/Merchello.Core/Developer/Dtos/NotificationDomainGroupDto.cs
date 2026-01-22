namespace Merchello.Core.Developer.Dtos;

/// <summary>
/// A group of notifications belonging to the same domain (e.g., Order, Payment).
/// </summary>
public record NotificationDomainGroupDto
{
    /// <summary>
    /// The domain name (e.g., "Order", "Payment", "Checkout").
    /// </summary>
    public required string Domain { get; init; }

    /// <summary>
    /// The notifications in this domain.
    /// </summary>
    public List<NotificationInfoDto> Notifications { get; init; } = [];

    /// <summary>
    /// Total number of notifications in this domain.
    /// </summary>
    public int NotificationCount => Notifications.Count;

    /// <summary>
    /// Total number of handler registrations across all notifications in this domain.
    /// </summary>
    public int HandlerCount => Notifications.Sum(n => n.Handlers.Count);
}
