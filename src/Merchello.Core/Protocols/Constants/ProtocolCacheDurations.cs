namespace Merchello.Core.Protocols;

/// <summary>
/// Protocol cache durations.
/// </summary>
public static class ProtocolCacheDurations
{
    public static readonly TimeSpan ManifestCache = TimeSpan.FromMinutes(60);
    public static readonly TimeSpan CapabilitiesCache = TimeSpan.FromMinutes(60);
    public static readonly TimeSpan SigningKeysCache = TimeSpan.FromHours(24);
    public static readonly TimeSpan AgentProfileCache = TimeSpan.FromMinutes(30);
}
