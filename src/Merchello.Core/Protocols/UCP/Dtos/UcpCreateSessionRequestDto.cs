using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Dtos;

/// <summary>
/// UCP Create Checkout Session request per UCP spec.
/// </summary>
public class UcpCreateSessionRequestDto
{
    [JsonPropertyName("line_items")]
    public List<UcpLineItemRequestDto>? LineItems { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("buyer")]
    public UcpBuyerInfoDto? Buyer { get; set; }

    [JsonPropertyName("discounts")]
    public UcpDiscountsRequestDto? Discounts { get; set; }

    [JsonPropertyName("fulfillment")]
    public UcpFulfillmentRequestDto? Fulfillment { get; set; }
}
