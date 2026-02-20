namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpTestCreateSessionRequestDto
{
    public string? ModeRequested { get; set; }

    public string? AgentId { get; set; }

    public UcpFlowTestCreateSessionPayloadDto? Request { get; set; }
}
