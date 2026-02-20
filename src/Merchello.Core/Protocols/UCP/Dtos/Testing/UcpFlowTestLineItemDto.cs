namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpFlowTestLineItemDto
{
    public string? Id { get; set; }

    public UcpFlowTestItemInfoDto? Item { get; set; }

    public int Quantity { get; set; } = 1;
}
