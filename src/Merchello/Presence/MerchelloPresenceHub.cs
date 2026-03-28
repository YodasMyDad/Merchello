using System.Security.Claims;
using Merchello.Presence.Dtos;
using Merchello.Presence.Models;
using Merchello.Presence.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Web.Common.Authorization;

namespace Merchello.Presence;

[Authorize(Policy = AuthorizationPolicies.SectionAccessContent)]
public sealed class MerchelloPresenceHub(
    IPresenceTrackingService presenceService,
    IUserService userService) : Hub
{
    public async Task JoinEntity(string entityKey)
    {
        var userKey = GetUserKey();
        if (userKey == Guid.Empty) return;

        var (displayName, avatarUrls) = await GetUserInfoAsync(userKey);

        var record = new EntityPresenceRecord(
            userKey,
            displayName,
            avatarUrls,
            Context.ConnectionId,
            DateTimeOffset.UtcNow);

        presenceService.Join(entityKey, record);
        await Groups.AddToGroupAsync(Context.ConnectionId, entityKey);
        await BroadcastPresence(entityKey);
    }

    public async Task LeaveEntity(string entityKey)
    {
        presenceService.Leave(entityKey, Context.ConnectionId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, entityKey);
        await BroadcastPresence(entityKey);
    }

    public Task Heartbeat()
    {
        presenceService.Heartbeat(Context.ConnectionId);
        return Task.CompletedTask;
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var affectedEntityKeys = presenceService.LeaveAll(Context.ConnectionId);

        foreach (var entityKey in affectedEntityKeys)
        {
            await BroadcastPresence(entityKey);
        }

        await base.OnDisconnectedAsync(exception);
    }

    private async Task BroadcastPresence(string entityKey)
    {
        var records = presenceService.GetPresence(entityKey);
        var users = DeduplicateByUser(records);
        await Clients.Group(entityKey).SendAsync("PresenceUpdated", entityKey, users);
    }

    private static List<PresenceUserDto> DeduplicateByUser(IReadOnlyList<EntityPresenceRecord> records) =>
        records
            .GroupBy(r => r.UserKey)
            .Select(g => g.OrderByDescending(r => r.LastSeen).First())
            .Select(r => new PresenceUserDto(r.UserKey.ToString(), r.DisplayName, r.AvatarUrls))
            .ToList();

    private async Task<(string DisplayName, string[] AvatarUrls)> GetUserInfoAsync(Guid userKey)
    {
        var user = await userService.GetAsync(userKey);
        if (user is null) return ("Unknown", []);

        var displayName = user.Name ?? "Unknown";
        var avatarUrls = string.IsNullOrEmpty(user.Avatar) ? [] : new[] { user.Avatar };
        return (displayName, avatarUrls);
    }

    private Guid GetUserKey()
    {
        var claim = Context.User?.FindFirst(Constants.Security.OpenIdDictSubClaimType)
                    ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier);

        return claim is not null && Guid.TryParse(claim.Value, out var key) ? key : Guid.Empty;
    }
}
