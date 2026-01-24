using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Protocols.UCP.Models;
using Merchello.Core.Protocols.UCP.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Protocols.UCP.Services;

/// <summary>
/// Service for fetching and caching UCP agent profiles.
/// Agent profiles contain capability configurations including webhook URLs.
/// </summary>
public class UcpAgentProfileService : IUcpAgentProfileService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ICacheService _cacheService;
    private readonly ILogger<UcpAgentProfileService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public UcpAgentProfileService(
        IHttpClientFactory httpClientFactory,
        ICacheService cacheService,
        ILogger<UcpAgentProfileService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _cacheService = cacheService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<UcpAgentProfile?> GetProfileAsync(string profileUri, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(profileUri))
        {
            return null;
        }

        // Validate URI format
        if (!Uri.TryCreate(profileUri, UriKind.Absolute, out var uri) ||
            (uri.Scheme != "https" && uri.Scheme != "http"))
        {
            _logger.LogWarning("Invalid agent profile URI format: {ProfileUri}", profileUri);
            return null;
        }

        // Create cache key from hash of the profile URI
        var cacheKey = CreateCacheKey(profileUri);

        return await _cacheService.GetOrCreateAsync(
            cacheKey,
            async _ => await FetchProfileAsync(uri, ct),
            ProtocolConstants.CacheDurations.AgentProfileCache,
            ["protocols", "agent-profiles"],
            ct);
    }

    /// <inheritdoc />
    public string? GetOrderWebhookUrl(UcpAgentProfile? profile)
    {
        if (profile?.Ucp?.Capabilities == null)
        {
            return null;
        }

        // Find the Order capability and extract the webhook URL
        var orderCapability = profile.Ucp.Capabilities
            .FirstOrDefault(c => string.Equals(c.Name, ProtocolConstants.UcpCapabilities.Order, StringComparison.OrdinalIgnoreCase));

        return orderCapability?.Config?.WebhookUrl;
    }

    private async Task<UcpAgentProfile?> FetchProfileAsync(Uri profileUri, CancellationToken ct)
    {
        try
        {
            _logger.LogDebug("Fetching agent profile from {ProfileUri}", profileUri);

            var client = _httpClientFactory.CreateClient("UcpAgentProfile");
            client.Timeout = TimeSpan.FromSeconds(10);

            using var request = new HttpRequestMessage(HttpMethod.Get, profileUri);
            request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
            request.Headers.Add("User-Agent", "Merchello-UCP/1.0");

            using var response = await client.SendAsync(request, ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Failed to fetch agent profile from {ProfileUri}. Status: {StatusCode}",
                    profileUri,
                    response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync(ct);
            var profile = JsonSerializer.Deserialize<UcpAgentProfile>(content, JsonOptions);

            if (profile != null)
            {
                _logger.LogInformation(
                    "Successfully fetched agent profile from {ProfileUri}. Agent: {AgentName}, Capabilities: {CapabilityCount}",
                    profileUri,
                    profile.Name ?? "unknown",
                    profile.Ucp?.Capabilities?.Count ?? 0);
            }

            return profile;
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("Timeout fetching agent profile from {ProfileUri}", profileUri);
            return null;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "HTTP error fetching agent profile from {ProfileUri}", profileUri);
            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse agent profile from {ProfileUri}", profileUri);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error fetching agent profile from {ProfileUri}", profileUri);
            return null;
        }
    }

    private static string CreateCacheKey(string profileUri)
    {
        // Hash the URI for a consistent-length cache key
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(profileUri));
        var hashString = Convert.ToHexString(hash)[..16].ToLowerInvariant();
        return $"{ProtocolConstants.CacheKeys.AgentProfilePrefix}{hashString}";
    }
}
