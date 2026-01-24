using System.Text.Json;

namespace Merchello.Core.Fulfilment.Providers.ShipBob;

/// <summary>
/// Configuration settings for ShipBob fulfilment provider.
/// Serialized to/from FulfilmentProviderConfiguration.SettingsJson.
/// </summary>
public sealed record ShipBobSettings
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <summary>
    /// ShipBob API base URL. Defaults to production.
    /// </summary>
    public string ApiBaseUrl { get; init; } = "https://api.shipbob.com";

    /// <summary>
    /// API version to use (e.g., "2025-07").
    /// </summary>
    public string ApiVersion { get; init; } = "2025-07";

    /// <summary>
    /// Personal Access Token for authentication.
    /// </summary>
    public string? PersonalAccessToken { get; init; }

    /// <summary>
    /// ShipBob Channel ID (required header for all API calls).
    /// </summary>
    public int? ChannelId { get; init; }

    /// <summary>
    /// Webhook secret for signature validation.
    /// </summary>
    public string? WebhookSecret { get; init; }

    /// <summary>
    /// Default fulfillment center ID (optional, for order routing).
    /// </summary>
    public int? DefaultFulfillmentCenterId { get; init; }

    /// <summary>
    /// Request timeout in seconds.
    /// </summary>
    public int TimeoutSeconds { get; init; } = 30;

    /// <summary>
    /// Whether to enable debug logging of API requests/responses.
    /// </summary>
    public bool EnableDebugLogging { get; init; }

    /// <summary>
    /// Default shipping method when no category mapping matches or category is null.
    /// </summary>
    public string? DefaultShippingMethod { get; init; }

    /// <summary>
    /// Validates the settings are complete for API operations.
    /// </summary>
    public bool IsValid =>
        !string.IsNullOrWhiteSpace(PersonalAccessToken) &&
        ChannelId.HasValue;

    /// <summary>
    /// Gets the full base URL including API version.
    /// </summary>
    public string GetVersionedBaseUrl() =>
        $"{ApiBaseUrl.TrimEnd('/')}/{ApiVersion}";

    /// <summary>
    /// Parses settings from JSON string.
    /// </summary>
    public static ShipBobSettings? FromJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<ShipBobSettings>(json, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// Serializes settings to JSON string.
    /// </summary>
    public string ToJson() => JsonSerializer.Serialize(this, JsonOptions);
}
