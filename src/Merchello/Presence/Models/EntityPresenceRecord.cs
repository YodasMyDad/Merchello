namespace Merchello.Presence.Models;

/// <summary>
/// Represents a single user connection's presence on an entity.
/// One record per SignalR connection — a user with multiple tabs produces multiple records.
/// </summary>
public sealed record EntityPresenceRecord(
    Guid UserKey,
    string DisplayName,
    string[] AvatarUrls,
    string ConnectionId,
    DateTimeOffset LastSeen);
