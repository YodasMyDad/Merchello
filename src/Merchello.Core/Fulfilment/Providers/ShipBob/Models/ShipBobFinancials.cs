using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Order financial information.
/// </summary>
public sealed record ShipBobFinancials
{
    [JsonPropertyName("total_price")]
    public decimal? TotalPrice { get; init; }
}
