namespace Merchello.Core.Developer.Dtos;

/// <summary>
/// Result of notification discovery containing all notifications grouped by domain.
/// </summary>
public record NotificationDiscoveryResultDto
{
    /// <summary>
    /// Notifications grouped by domain (Order, Payment, etc.).
    /// </summary>
    public List<NotificationDomainGroupDto> Domains { get; init; } = [];

    /// <summary>
    /// Total number of notification types discovered.
    /// </summary>
    public int TotalNotifications { get; init; }

    /// <summary>
    /// Total number of handler registrations across all notifications.
    /// </summary>
    public int TotalHandlers { get; init; }
}
