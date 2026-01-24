using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Response containing list of fulfillment centers.
/// </summary>
public sealed record ShipBobFulfillmentCentersResponse
{
    [JsonPropertyName("fulfillment_centers")]
    public IReadOnlyList<ShipBobFulfillmentCenter>? FulfillmentCenters { get; init; }
}
