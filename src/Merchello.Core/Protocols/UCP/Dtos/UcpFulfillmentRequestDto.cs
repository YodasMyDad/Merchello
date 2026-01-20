using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Dtos;

/// <summary>
/// UCP fulfillment request.
/// </summary>
public class UcpFulfillmentRequestDto
{
    [JsonPropertyName("methods")]
    public List<UcpFulfillmentMethodRequestDto>? Methods { get; set; }

    /// <summary>
    /// Convenience property to access groups from the first shipping method.
    /// Used by the adapter for simplified group selection handling.
    /// </summary>
    [JsonPropertyName("groups")]
    public List<UcpFulfillmentGroupSelectionDto>? Groups { get; set; }
}
