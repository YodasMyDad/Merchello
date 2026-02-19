namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpFlowTestFulfillmentMethodDto
{
    public string? Type { get; set; }

    public List<UcpFlowTestFulfillmentDestinationDto>? Destinations { get; set; }

    public List<UcpFlowTestFulfillmentGroupSelectionDto>? Groups { get; set; }
}
