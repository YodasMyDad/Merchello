namespace Merchello.Core.Protocols.UCP.Models;

/// <summary>
/// UCP manifest structure for /.well-known/ucp endpoint.
/// </summary>
public record UcpManifest
{
    public required UcpManifestMetadata Ucp { get; init; }
    public required UcpPaymentInfo Payment { get; init; }
    public required List<UcpSigningKey> SigningKeys { get; init; }
}
