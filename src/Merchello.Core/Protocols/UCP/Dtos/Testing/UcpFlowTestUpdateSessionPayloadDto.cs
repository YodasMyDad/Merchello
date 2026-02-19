namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpFlowTestUpdateSessionPayloadDto
{
    public List<UcpFlowTestLineItemDto>? LineItems { get; set; }

    public UcpFlowTestBuyerInfoDto? Buyer { get; set; }

    public UcpFlowTestDiscountsDto? Discounts { get; set; }

    public UcpFlowTestFulfillmentDto? Fulfillment { get; set; }
}
