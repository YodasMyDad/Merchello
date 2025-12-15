using System.Text.Json.Serialization;

namespace Merchello.ShippingProviders.UPS.Models;

/// <summary>
/// Response from UPS OAuth token endpoint.
/// </summary>
public class UpsAuthResponse
{
    [JsonPropertyName("access_token")]
    public string? AccessToken { get; set; }

    [JsonPropertyName("token_type")]
    public string? TokenType { get; set; }

    [JsonPropertyName("expires_in")]
    public int ExpiresIn { get; set; }

    [JsonPropertyName("issued_at")]
    public string? IssuedAt { get; set; }

    [JsonPropertyName("client_id")]
    public string? ClientId { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }
}
