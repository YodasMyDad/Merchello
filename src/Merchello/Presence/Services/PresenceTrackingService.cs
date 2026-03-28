using System.Collections.Concurrent;
using Merchello.Presence.Models;
using Merchello.Presence.Services.Interfaces;

namespace Merchello.Presence.Services;

public sealed class PresenceTrackingService : IPresenceTrackingService
{
    // entityKey → (connectionId → record)
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, EntityPresenceRecord>> _entities = new();

    // connectionId → set of entity keys (reverse index for O(1) LeaveAll)
    private readonly ConcurrentDictionary<string, HashSet<string>> _connectionEntities = new();
    private readonly object _reverseIndexLock = new();

    public void Join(string entityKey, EntityPresenceRecord record)
    {
        var connections = _entities.GetOrAdd(entityKey, _ => new ConcurrentDictionary<string, EntityPresenceRecord>());
        connections[record.ConnectionId] = record;

        lock (_reverseIndexLock)
        {
            var entityKeys = _connectionEntities.GetOrAdd(record.ConnectionId, _ => []);
            entityKeys.Add(entityKey);
        }
    }

    public void Leave(string entityKey, string connectionId)
    {
        if (_entities.TryGetValue(entityKey, out var connections))
        {
            connections.TryRemove(connectionId, out _);
            // Don't eagerly remove empty entity dictionaries here — a concurrent Join
            // could race between IsEmpty check and TryRemove. RemoveStale handles cleanup.
        }

        lock (_reverseIndexLock)
        {
            if (_connectionEntities.TryGetValue(connectionId, out var entityKeys))
            {
                entityKeys.Remove(entityKey);

                if (entityKeys.Count == 0)
                {
                    _connectionEntities.TryRemove(connectionId, out _);
                }
            }
        }
    }

    public IReadOnlyList<string> LeaveAll(string connectionId)
    {
        HashSet<string> entityKeys;
        lock (_reverseIndexLock)
        {
            if (!_connectionEntities.TryRemove(connectionId, out entityKeys!))
            {
                return [];
            }
        }

        foreach (var entityKey in entityKeys)
        {
            if (_entities.TryGetValue(entityKey, out var connections))
            {
                connections.TryRemove(connectionId, out _);
            }
        }

        return [.. entityKeys];
    }

    public void Heartbeat(string connectionId)
    {
        HashSet<string> entityKeys;
        lock (_reverseIndexLock)
        {
            if (!_connectionEntities.TryGetValue(connectionId, out entityKeys!))
            {
                return;
            }

            // Snapshot to iterate outside lock
            entityKeys = [.. entityKeys];
        }

        var now = DateTimeOffset.UtcNow;
        foreach (var entityKey in entityKeys)
        {
            if (_entities.TryGetValue(entityKey, out var connections) &&
                connections.TryGetValue(connectionId, out var existing))
            {
                connections[connectionId] = existing with { LastSeen = now };
            }
        }
    }

    public IReadOnlyList<EntityPresenceRecord> GetPresence(string entityKey)
    {
        if (_entities.TryGetValue(entityKey, out var connections))
        {
            return [.. connections.Values];
        }

        return [];
    }

    public IReadOnlyList<string> RemoveStale(TimeSpan maxAge)
    {
        var cutoff = DateTimeOffset.UtcNow - maxAge;
        var changedEntityKeys = new List<string>();

        foreach (var (entityKey, connections) in _entities)
        {
            // Clean up empty entity entries left by Leave/LeaveAll
            if (connections.IsEmpty)
            {
                _entities.TryRemove(entityKey, out _);
                continue;
            }

            var staleConnectionIds = connections
                .Where(kvp => kvp.Value.LastSeen < cutoff)
                .Select(kvp => kvp.Key)
                .ToList();

            if (staleConnectionIds.Count == 0) continue;

            foreach (var connectionId in staleConnectionIds)
            {
                connections.TryRemove(connectionId, out _);

                lock (_reverseIndexLock)
                {
                    if (_connectionEntities.TryGetValue(connectionId, out var entityKeys))
                    {
                        entityKeys.Remove(entityKey);
                        if (entityKeys.Count == 0)
                        {
                            _connectionEntities.TryRemove(connectionId, out _);
                        }
                    }
                }
            }

            if (connections.IsEmpty)
            {
                _entities.TryRemove(entityKey, out _);
            }

            changedEntityKeys.Add(entityKey);
        }

        return changedEntityKeys;
    }
}
