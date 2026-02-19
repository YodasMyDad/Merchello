namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpFlowDiagnosticsDto
{
    public string ProtocolVersion { get; set; } = string.Empty;

    public List<string> Capabilities { get; set; } = [];

    public List<string> Extensions { get; set; } = [];

    public bool RequireHttps { get; set; }

    public string MinimumTlsVersion { get; set; } = string.Empty;

    public string? PublicBaseUrl { get; set; }

    public string? EffectiveBaseUrl { get; set; }

    public bool StrictModeAvailable { get; set; }

    public string? StrictModeBlockReason { get; set; }

    public string StrictFallbackMode { get; set; } = "adapter";

    public string SimulatedAgentId { get; set; } = string.Empty;

    public string? SimulatedAgentProfileUrl { get; set; }

    public DateTime TimestampUtc { get; set; }
}
