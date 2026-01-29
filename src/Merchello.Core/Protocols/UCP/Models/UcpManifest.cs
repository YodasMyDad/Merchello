using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Models;

/// <summary>
/// UCP manifest structure for /.well-known/ucp endpoint.
/// </summary>
public record UcpManifest
{
    [JsonPropertyName("ucp")]
    public required UcpManifestMetadata Ucp { get; init; }

    [JsonPropertyName("payment")]
    public required UcpPaymentInfo Payment { get; init; }

    [JsonPropertyName("signing_keys")]
    public required List<UcpSigningKey> SigningKeys { get; init; }
}
