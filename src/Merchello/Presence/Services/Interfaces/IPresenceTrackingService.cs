using Merchello.Presence.Models;

namespace Merchello.Presence.Services.Interfaces;

public interface IPresenceTrackingService
{
    void Join(string entityKey, EntityPresenceRecord record);

    void Leave(string entityKey, string connectionId);

    /// <summary>
    /// Removes the connection from all entities. Returns the entity keys that were affected.
    /// </summary>
    IReadOnlyList<string> LeaveAll(string connectionId);

    void Heartbeat(string connectionId);

    IReadOnlyList<EntityPresenceRecord> GetPresence(string entityKey);

    /// <summary>
    /// Removes presence records older than <paramref name="maxAge"/>.
    /// Returns the entity keys whose presence lists changed.
    /// </summary>
    IReadOnlyList<string> RemoveStale(TimeSpan maxAge);
}
