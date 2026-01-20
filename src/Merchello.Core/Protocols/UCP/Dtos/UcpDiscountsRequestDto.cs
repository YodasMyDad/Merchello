using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Dtos;

/// <summary>
/// UCP discounts request.
/// </summary>
public class UcpDiscountsRequestDto
{
    [JsonPropertyName("codes")]
    public List<string>? Codes { get; set; }
}
