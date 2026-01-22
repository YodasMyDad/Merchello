using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// ShipBob address for orders (shipping/billing).
/// </summary>
public sealed record ShipBobAddress
{
    [JsonPropertyName("address1")]
    public required string Address1 { get; init; }

    [JsonPropertyName("address2")]
    public string? Address2 { get; init; }

    [JsonPropertyName("city")]
    public required string City { get; init; }

    [JsonPropertyName("state")]
    public string? State { get; init; }

    [JsonPropertyName("zip_code")]
    public required string ZipCode { get; init; }

    [JsonPropertyName("country")]
    public required string Country { get; init; }

    [JsonPropertyName("company_name")]
    public string? CompanyName { get; init; }
}

/// <summary>
/// ShipBob recipient (person + address).
/// </summary>
public sealed record ShipBobRecipient
{
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    [JsonPropertyName("address")]
    public required ShipBobAddress Address { get; init; }

    [JsonPropertyName("email")]
    public string? Email { get; init; }

    [JsonPropertyName("phone_number")]
    public string? PhoneNumber { get; init; }
}
