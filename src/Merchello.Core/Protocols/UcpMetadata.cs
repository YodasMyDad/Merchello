using System.Text.Json.Serialization;
using Merchello.Core.Protocols.Models;

namespace Merchello.Core.Protocols;

/// <summary>
/// UCP metadata included in every response per spec requirement.
/// </summary>
public class UcpMetadata
{
    /// <summary>
    /// Protocol version (YYYY-MM-DD format).
    /// </summary>
    public required string Version { get; init; }

    /// <summary>
    /// Active capabilities with their resolved versions.
    /// </summary>
    public required IReadOnlyDictionary<string, string> Capabilities { get; init; }

    /// <summary>
    /// Available payment handlers for the current protocol response context.
    /// </summary>
    [JsonPropertyName("payment_handlers")]
    public IReadOnlyList<ProtocolPaymentHandler>? PaymentHandlers { get; init; }
}
