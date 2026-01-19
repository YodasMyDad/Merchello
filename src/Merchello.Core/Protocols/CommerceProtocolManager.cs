using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Shared.Reflection;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Protocols;

/// <summary>
/// Manages registration and resolution of commerce protocol adapters.
/// Uses ExtensionManager pattern for discovery.
/// </summary>
public class CommerceProtocolManager(
    ExtensionManager extensionManager,
    ICacheService cacheService,
    ILogger<CommerceProtocolManager> logger) : ICommerceProtocolManager, IDisposable
{
    private readonly SemaphoreSlim _cacheLock = new(1, 1);
    private volatile IReadOnlyList<ICommerceProtocolAdapter>? _cachedAdapters;
    private bool _disposed;

    /// <inheritdoc />
    public IReadOnlyList<ICommerceProtocolAdapter> Adapters => _cachedAdapters ?? [];

    /// <inheritdoc />
    public async Task<IReadOnlyList<ICommerceProtocolAdapter>> GetAdaptersAsync(CancellationToken ct = default)
    {
        // Fast path - volatile read ensures we see latest value
        var cached = _cachedAdapters;
        if (cached != null)
        {
            return cached;
        }

        // Thread-safe initialization using semaphore
        await _cacheLock.WaitAsync(ct);
        try
        {
            // Double-check after acquiring lock
            cached = _cachedAdapters;
            if (cached != null)
            {
                return cached;
            }

            var adapterInstances = extensionManager.GetInstances<ICommerceProtocolAdapter>(useCaching: true)
                .Where(p => p != null)
                .Cast<ICommerceProtocolAdapter>()
                .ToList();

            List<ICommerceProtocolAdapter> registeredAdapters = [];
            HashSet<string> aliases = new(StringComparer.OrdinalIgnoreCase);

            foreach (var adapter in adapterInstances)
            {
                var metadata = adapter.Metadata;
                if (string.IsNullOrWhiteSpace(metadata.Alias))
                {
                    logger.LogWarning("Protocol adapter {AdapterType} has an empty metadata alias and will be ignored.", adapter.GetType().FullName);
                    continue;
                }

                if (!aliases.Add(metadata.Alias))
                {
                    logger.LogWarning("Duplicate protocol adapter alias '{Alias}' detected. Adapter {AdapterType} will be skipped.", metadata.Alias, adapter.GetType().FullName);
                    continue;
                }

                logger.LogInformation("Registered protocol adapter: {Alias} ({DisplayName}) v{Version}",
                    metadata.Alias, metadata.DisplayName, metadata.Version);

                registeredAdapters.Add(adapter);
            }

            // Thread-safe assignment - volatile write ensures visibility
            _cachedAdapters = registeredAdapters;
            return registeredAdapters;
        }
        finally
        {
            _cacheLock.Release();
        }
    }

    /// <inheritdoc />
    public ICommerceProtocolAdapter? GetAdapter(string alias)
    {
        if (string.IsNullOrWhiteSpace(alias))
        {
            return null;
        }

        return Adapters.FirstOrDefault(a =>
            string.Equals(a.Metadata.Alias, alias, StringComparison.OrdinalIgnoreCase));
    }

    /// <inheritdoc />
    public bool IsProtocolSupported(string alias)
    {
        return GetAdapter(alias)?.IsEnabled == true;
    }

    /// <inheritdoc />
    public IReadOnlyList<string> GetEnabledProtocols()
    {
        return Adapters
            .Where(a => a.IsEnabled)
            .Select(a => a.Metadata.Alias)
            .ToList();
    }

    /// <inheritdoc />
    public async Task<object?> GetCachedManifestAsync(string alias, CancellationToken ct = default)
    {
        var cacheKey = $"{ProtocolConstants.CacheKeys.ManifestPrefix}{alias.ToLowerInvariant()}";

        return await cacheService.GetOrCreateAsync(
            cacheKey,
            async _ =>
            {
                var adapter = GetAdapter(alias);
                if (adapter == null || !adapter.IsEnabled)
                {
                    return null;
                }

                return await adapter.GenerateManifestAsync(ct);
            },
            ProtocolConstants.CacheDurations.ManifestCache,
            ["protocols", $"protocol:{alias}"],
            ct);
    }

    /// <inheritdoc />
    public async Task<object?> GetNegotiatedManifestAsync(
        string alias,
        AgentIdentity? agent,
        CancellationToken ct = default)
    {
        var fullManifest = await GetCachedManifestAsync(alias, ct);
        if (fullManifest == null || agent?.Capabilities == null || agent.Capabilities.Count == 0)
        {
            return fullManifest;
        }

        var adapter = GetAdapter(alias);
        if (adapter == null)
        {
            return fullManifest;
        }

        // Filter manifest to intersection of capabilities
        return await adapter.NegotiateCapabilitiesAsync(fullManifest, agent.Capabilities, ct);
    }

    /// <summary>
    /// Clears the adapter cache, forcing rediscovery on next access.
    /// </summary>
    public void ClearCache()
    {
        DisposeAdapters();
        _cachedAdapters = null;
    }

    private void DisposeAdapters()
    {
        var adapters = _cachedAdapters;
        if (adapters == null) return;

        foreach (var adapter in adapters)
        {
            if (adapter is IDisposable disposable)
            {
                try
                {
                    disposable.Dispose();
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Error disposing protocol adapter {Alias}", adapter.Metadata.Alias);
                }
            }
        }
    }

    /// <inheritdoc />
    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        DisposeAdapters();
        _cachedAdapters = null;
        _cacheLock.Dispose();

        GC.SuppressFinalize(this);
    }
}
