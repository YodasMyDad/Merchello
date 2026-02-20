namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpFlowTestFulfillmentDto
{
    public List<UcpFlowTestFulfillmentMethodDto>? Methods { get; set; }

    public List<UcpFlowTestFulfillmentGroupSelectionDto>? Groups { get; set; }
}
