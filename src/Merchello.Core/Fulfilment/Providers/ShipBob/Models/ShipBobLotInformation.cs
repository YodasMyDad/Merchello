using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Lot tracking information.
/// </summary>
public sealed record ShipBobLotInformation
{
    [JsonPropertyName("is_lot")]
    public bool IsLot { get; init; }

    [JsonPropertyName("minimum_shelf_life_days")]
    public int? MinimumShelfLifeDays { get; init; }
}
