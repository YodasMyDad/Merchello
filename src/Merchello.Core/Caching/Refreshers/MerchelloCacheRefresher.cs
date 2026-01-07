using Umbraco.Cms.Core.Cache;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Core.Sync;

namespace Merchello.Core.Caching.Refreshers;

/// <summary>
/// Single generic cache refresher for all Merchello cache invalidation.
/// Clears cache by prefix across all servers in a load-balanced environment.
/// </summary>
public sealed class MerchelloCacheRefresher(
    AppCaches appCaches,
    IJsonSerializer serializer,
    IEventAggregator eventAggregator,
    ICacheRefresherNotificationFactory factory)
    : PayloadCacheRefresherBase<MerchelloCacheRefresherNotification, MerchelloCacheRefresher.CachePayload>(
        appCaches, serializer, eventAggregator, factory)
{
    /// <summary>
    /// Unique identifier for this cache refresher.
    /// </summary>
    public static readonly Guid UniqueId = new("5E8A3B9C-7D2F-4E1A-BC6D-9F8E0A1B2C3D");

    /// <inheritdoc />
    public override Guid RefresherUniqueId => UniqueId;

    /// <inheritdoc />
    public override string Name => "Merchello Cache Refresher";

    /// <summary>
    /// Called when receiving from OTHER servers (via IServerMessenger).
    /// </summary>
    public override void Refresh(CachePayload[] payloads)
    {
        ClearCacheByPayloads(payloads);
        base.Refresh(payloads);
    }

    /// <summary>
    /// Called on the ORIGINATING server (before sending to others).
    /// </summary>
    public override void RefreshInternal(CachePayload[] payloads)
    {
        ClearCacheByPayloads(payloads);
        base.RefreshInternal(payloads);
    }

    private void ClearCacheByPayloads(CachePayload[] payloads)
    {
        foreach (var payload in payloads)
        {
            if (payload.ClearAll)
            {
                AppCaches.RuntimeCache.ClearByRegex("^merchello:");
            }
            else if (!string.IsNullOrEmpty(payload.Prefix))
            {
                AppCaches.RuntimeCache.ClearByRegex($"^merchello:{System.Text.RegularExpressions.Regex.Escape(payload.Prefix)}:");
            }
            else if (!string.IsNullOrEmpty(payload.Key))
            {
                AppCaches.RuntimeCache.ClearByKey(payload.Key);
            }
        }
    }

    /// <summary>
    /// Payload for cache refresh messages.
    /// </summary>
    public sealed class CachePayload
    {
        /// <summary>
        /// Cache key prefix to clear (e.g., "exchange-rates", "locality", "shipping").
        /// </summary>
        public string? Prefix { get; init; }

        /// <summary>
        /// Specific cache key to clear.
        /// </summary>
        public string? Key { get; init; }

        /// <summary>
        /// When true, clears all Merchello cache entries.
        /// </summary>
        public bool ClearAll { get; init; }
    }
}
