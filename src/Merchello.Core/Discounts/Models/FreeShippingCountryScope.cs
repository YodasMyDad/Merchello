using System.Text.Json.Serialization;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Country scope for free shipping discounts.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum FreeShippingCountryScope
{
    /// <summary>
    /// Free shipping applies to all countries.
    /// </summary>
    AllCountries,

    /// <summary>
    /// Free shipping applies only to selected countries.
    /// </summary>
    SelectedCountries,

    /// <summary>
    /// Free shipping applies to all countries except excluded ones.
    /// </summary>
    ExcludedCountries
}
