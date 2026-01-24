using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// ShipBob fulfillment center information.
/// </summary>
public sealed record ShipBobFulfillmentCenter
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("timezone")]
    public string? Timezone { get; init; }

    [JsonPropertyName("address1")]
    public string? Address1 { get; init; }

    [JsonPropertyName("address2")]
    public string? Address2 { get; init; }

    [JsonPropertyName("city")]
    public string? City { get; init; }

    [JsonPropertyName("state")]
    public string? State { get; init; }

    [JsonPropertyName("zip_code")]
    public string? ZipCode { get; init; }

    [JsonPropertyName("country")]
    public string? Country { get; init; }

    [JsonPropertyName("email")]
    public string? Email { get; init; }

    [JsonPropertyName("phone_number")]
    public string? PhoneNumber { get; init; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; init; }

    [JsonPropertyName("is_receiving_enabled")]
    public bool IsReceivingEnabled { get; init; }

    [JsonPropertyName("services")]
    public IReadOnlyList<string>? Services { get; init; }
}
