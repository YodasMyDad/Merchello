namespace Merchello.Core.Protocols.UCP.Models;

public record UcpRestEndpoint
{
    public required string Endpoint { get; init; }
    public required string Schema { get; init; }
}
