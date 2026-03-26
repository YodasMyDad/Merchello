using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Dtos;

/// <summary>
/// UCP Update Cart request per UCP draft spec.
/// </summary>
public class UcpUpdateCartRequestDto
{
    [JsonPropertyName("line_items")]
    public List<UcpLineItemRequestDto>? LineItems { get; set; }

    [JsonPropertyName("context")]
    public UcpCartContextDto? Context { get; set; }

    [JsonPropertyName("signals")]
    public UcpCartSignalsDto? Signals { get; set; }

    [JsonPropertyName("buyer")]
    public UcpBuyerInfoDto? Buyer { get; set; }
}
