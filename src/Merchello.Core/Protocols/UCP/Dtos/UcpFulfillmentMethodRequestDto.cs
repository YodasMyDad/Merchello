using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Dtos;

/// <summary>
/// UCP fulfillment method request.
/// </summary>
public class UcpFulfillmentMethodRequestDto
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("destinations")]
    public List<UcpFulfillmentDestinationDto>? Destinations { get; set; }

    [JsonPropertyName("groups")]
    public List<UcpFulfillmentGroupSelectionDto>? Groups { get; set; }
}
