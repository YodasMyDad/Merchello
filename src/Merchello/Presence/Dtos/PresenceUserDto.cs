namespace Merchello.Presence.Dtos;

/// <summary>
/// Sent to clients on PresenceUpdated events, deduplicated by UserKey.
/// </summary>
public sealed record PresenceUserDto(string UserKey, string DisplayName, string[] AvatarUrls);
