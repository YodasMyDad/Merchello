using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Dtos;

/// <summary>
/// UCP fulfillment group selection.
/// </summary>
public class UcpFulfillmentGroupSelectionDto
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("selected_option_id")]
    public string? SelectedOptionId { get; set; }
}
