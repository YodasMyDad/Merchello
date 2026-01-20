using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Dtos;

/// <summary>
/// UCP line item in request.
/// </summary>
public class UcpLineItemRequestDto
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("item")]
    public UcpItemInfoDto? Item { get; set; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; } = 1;
}
