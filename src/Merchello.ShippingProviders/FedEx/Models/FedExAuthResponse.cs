using System.Text.Json.Serialization;

namespace Merchello.ShippingProviders.FedEx.Models;

/// <summary>
/// Response from FedEx OAuth token endpoint.
/// </summary>
public class FedExAuthResponse
{
    /// <summary>
    /// The OAuth access token.
    /// </summary>
    [JsonPropertyName("access_token")]
    public string AccessToken { get; set; } = null!;

    /// <summary>
    /// Token type (typically "bearer").
    /// </summary>
    [JsonPropertyName("token_type")]
    public string TokenType { get; set; } = null!;

    /// <summary>
    /// Token expiry time in seconds.
    /// </summary>
    [JsonPropertyName("expires_in")]
    public int ExpiresIn { get; set; }

    /// <summary>
    /// Scope of the token.
    /// </summary>
    [JsonPropertyName("scope")]
    public string? Scope { get; set; }
}
