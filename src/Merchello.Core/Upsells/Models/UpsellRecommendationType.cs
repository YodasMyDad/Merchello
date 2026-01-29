using System.Text.Json.Serialization;

namespace Merchello.Core.Upsells.Models;

/// <summary>
/// The type of recommendation that defines which products to suggest.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UpsellRecommendationType
{
    ProductTypes,
    ProductFilters,
    Collections,
    SpecificProducts,
    Suppliers
}
