using Merchello.Presence.Dtos;
using Merchello.Presence.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Merchello.Presence.Services;

/// <summary>
/// Periodically sweeps stale presence records (e.g. from browser crashes where
/// OnDisconnectedAsync didn't fire cleanly) and broadcasts updates to affected groups.
/// </summary>
public sealed class PresenceCleanupHostedService(
    IPresenceTrackingService presenceService,
    IHubContext<MerchelloPresenceHub> hubContext,
    ILogger<PresenceCleanupHostedService> logger) : BackgroundService
{
    private static readonly TimeSpan SweepInterval = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan MaxAge = TimeSpan.FromSeconds(45);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(SweepInterval, stoppingToken);

            try
            {
                var changedEntityKeys = presenceService.RemoveStale(MaxAge);

                foreach (var entityKey in changedEntityKeys)
                {
                    var records = presenceService.GetPresence(entityKey);
                    var users = records
                        .GroupBy(r => r.UserKey)
                        .Select(g => g.OrderByDescending(r => r.LastSeen).First())
                        .Select(r => new PresenceUserDto(r.UserKey.ToString(), r.DisplayName, r.AvatarUrls))
                        .ToList();

                    await hubContext.Clients.Group(entityKey).SendAsync(
                        "PresenceUpdated", entityKey, users, stoppingToken);
                }

                if (changedEntityKeys.Count > 0)
                {
                    logger.LogDebug("Presence cleanup removed stale records from {Count} entities", changedEntityKeys.Count);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during presence cleanup sweep");
            }
        }
    }
}
