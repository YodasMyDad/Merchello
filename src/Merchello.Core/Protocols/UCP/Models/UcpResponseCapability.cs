namespace Merchello.Core.Protocols.UCP.Models;

/// <summary>
/// Capability entry in the UCP response metadata.
/// Per spec, capabilities in responses are an array of objects with name and version.
/// </summary>
public record UcpResponseCapability
{
    public required string Name { get; init; }
    public required string Version { get; init; }
}
