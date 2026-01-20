using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Dtos;

/// <summary>
/// UCP Update Checkout Session request per UCP spec.
/// </summary>
public class UcpUpdateSessionRequestDto
{
    [JsonPropertyName("line_items")]
    public List<UcpLineItemRequestDto>? LineItems { get; set; }

    [JsonPropertyName("buyer")]
    public UcpBuyerInfoDto? Buyer { get; set; }

    [JsonPropertyName("discounts")]
    public UcpDiscountsRequestDto? Discounts { get; set; }

    [JsonPropertyName("fulfillment")]
    public UcpFulfillmentRequestDto? Fulfillment { get; set; }
}
