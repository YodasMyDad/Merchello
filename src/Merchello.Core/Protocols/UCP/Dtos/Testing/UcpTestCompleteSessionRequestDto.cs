namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpTestCompleteSessionRequestDto
{
    public string? ModeRequested { get; set; }

    public string? AgentId { get; set; }

    public string SessionId { get; set; } = string.Empty;

    public bool DryRun { get; set; } = true;

    public UcpFlowTestCompleteSessionPayloadDto? Request { get; set; }
}
