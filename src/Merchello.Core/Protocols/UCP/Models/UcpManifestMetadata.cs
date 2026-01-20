namespace Merchello.Core.Protocols.UCP.Models;

public record UcpManifestMetadata
{
    public required string Version { get; init; }
    public required UcpServices Services { get; init; }
    public required List<UcpCapability> Capabilities { get; init; }
}
