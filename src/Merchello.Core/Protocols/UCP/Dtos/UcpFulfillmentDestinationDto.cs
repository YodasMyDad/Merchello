using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Dtos;

/// <summary>
/// UCP fulfillment destination.
/// </summary>
public class UcpFulfillmentDestinationDto
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("address")]
    public UcpAddressDto? Address { get; set; }
}
