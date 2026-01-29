using System.Text.Json.Serialization;

namespace Merchello.Core.Upsells.Models;

/// <summary>
/// The type of trigger condition that activates an upsell rule.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UpsellTriggerType
{
    ProductTypes,
    ProductFilters,
    Collections,
    SpecificProducts,
    Suppliers,
    MinimumCartValue,
    MaximumCartValue,
    CartValueBetween
}
