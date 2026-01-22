using Asp.Versioning;
using Merchello.Core.Developer.Dtos;
using Merchello.Core.Developer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for notification system introspection (developer tools).
/// Provides discovery of notification types and their registered handlers.
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class NotificationsApiController(
    INotificationDiscoveryService discoveryService) : MerchelloApiControllerBase
{
    /// <summary>
    /// Get all notification types and their handlers grouped by domain.
    /// Useful for developers to understand the notification execution flow and choose appropriate handler priorities.
    /// </summary>
    [HttpGet("notifications")]
    [ProducesResponseType<NotificationDiscoveryResultDto>(StatusCodes.Status200OK)]
    public async Task<NotificationDiscoveryResultDto> GetNotifications(CancellationToken ct = default)
    {
        return await discoveryService.GetNotificationMetadataAsync(ct);
    }
}
