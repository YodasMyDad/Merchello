namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpTestCancelSessionRequestDto
{
    public string? ModeRequested { get; set; }

    public string? AgentId { get; set; }

    public string SessionId { get; set; } = string.Empty;
}
