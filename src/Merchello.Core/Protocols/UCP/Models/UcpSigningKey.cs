namespace Merchello.Core.Protocols.UCP.Models;

public record UcpSigningKey
{
    public required string Kty { get; init; }
    public required string Kid { get; init; }
    public required string Crv { get; init; }
    public required string X { get; init; }
    public required string Y { get; init; }
    public string Use { get; init; } = "sig";
    public string Alg { get; init; } = "ES256";
}
