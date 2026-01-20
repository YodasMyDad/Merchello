namespace Merchello.Core.Protocols.UCP.Models;

public record UcpCapability
{
    public required string Name { get; init; }
    public required string Version { get; init; }
    public required string Spec { get; init; }
    public required string Schema { get; init; }
    public string? Extends { get; init; }
}
