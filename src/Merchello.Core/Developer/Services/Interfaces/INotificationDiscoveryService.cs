using Merchello.Core.Developer.Dtos;

namespace Merchello.Core.Developer.Services.Interfaces;

/// <summary>
/// Service for discovering notification types and their registered handlers at runtime.
/// </summary>
public interface INotificationDiscoveryService
{
    /// <summary>
    /// Gets all discovered notifications and their handlers, grouped by domain.
    /// Results are cached since they are static at runtime.
    /// </summary>
    Task<NotificationDiscoveryResultDto> GetNotificationMetadataAsync(CancellationToken ct = default);
}
