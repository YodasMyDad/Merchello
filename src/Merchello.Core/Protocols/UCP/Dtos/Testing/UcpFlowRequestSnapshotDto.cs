namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpFlowRequestSnapshotDto
{
    public string Method { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;

    public Dictionary<string, string> Headers { get; set; } = [];

    public string? Body { get; set; }

    public DateTime TimestampUtc { get; set; }
}
