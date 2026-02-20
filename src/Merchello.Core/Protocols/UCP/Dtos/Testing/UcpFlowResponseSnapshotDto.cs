namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpFlowResponseSnapshotDto
{
    public int StatusCode { get; set; }

    public Dictionary<string, string> Headers { get; set; } = [];

    public string? Body { get; set; }

    public DateTime TimestampUtc { get; set; }
}
