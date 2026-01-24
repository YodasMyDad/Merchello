using Merchello.Core.Protocols.UCP.Models;

namespace Merchello.Core.Protocols.UCP.Services.Interfaces;

/// <summary>
/// Service for fetching and caching UCP agent profiles.
/// Agent profiles contain capability configurations including webhook URLs.
/// </summary>
public interface IUcpAgentProfileService
{
    /// <summary>
    /// Fetches an agent's profile from their profile URI.
    /// Results are cached to avoid repeated network requests.
    /// </summary>
    /// <param name="profileUri">The agent's profile URI from the UCP-Agent header.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The agent profile, or null if fetch failed.</returns>
    Task<UcpAgentProfile?> GetProfileAsync(string profileUri, CancellationToken ct = default);

    /// <summary>
    /// Extracts the Order capability webhook URL from an agent profile.
    /// </summary>
    /// <param name="profile">The agent profile.</param>
    /// <returns>The webhook URL, or null if not configured.</returns>
    string? GetOrderWebhookUrl(UcpAgentProfile? profile);
}
