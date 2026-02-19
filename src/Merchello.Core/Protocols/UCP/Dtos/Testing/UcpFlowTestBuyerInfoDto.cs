namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpFlowTestBuyerInfoDto
{
    public string? Email { get; set; }

    public string? Phone { get; set; }

    public UcpFlowTestAddressDto? BillingAddress { get; set; }

    public UcpFlowTestAddressDto? ShippingAddress { get; set; }

    public bool? ShippingSameAsBilling { get; set; }
}
