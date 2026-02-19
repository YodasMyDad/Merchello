namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpTestGetOrderRequestDto
{
    public string? ModeRequested { get; set; }

    public string? AgentId { get; set; }

    public string OrderId { get; set; } = string.Empty;
}
