using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Status detail with ID and name.
/// </summary>
public sealed record ShipBobStatusDetail
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("exception_fulfillment_center_id")]
    public int? ExceptionFulfillmentCenterId { get; init; }
}
