using System.Text.Json.Serialization;

namespace Merchello.Core.Upsells.Models;

/// <summary>
/// How recommended products are sorted within an upsell suggestion.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UpsellSortBy
{
    BestSeller,
    PriceLowToHigh,
    PriceHighToLow,
    Name,
    DateAdded,
    Random
}
