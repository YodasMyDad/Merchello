using System.Text.Json.Serialization;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// What the discount targets (products, collections, etc.).
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DiscountTargetType
{
    /// <summary>
    /// Applies to all products.
    /// </summary>
    AllProducts,

    /// <summary>
    /// Applies to specific products (including variants).
    /// </summary>
    SpecificProducts,

    /// <summary>
    /// Applies to products in specific collections.
    /// </summary>
    Collections,

    /// <summary>
    /// Applies to products matching specific filter values.
    /// </summary>
    ProductFilters,

    /// <summary>
    /// Applies to products of specific types.
    /// </summary>
    ProductTypes,

    /// <summary>
    /// Applies to products from specific suppliers.
    /// </summary>
    Suppliers,

    /// <summary>
    /// Applies to products from specific warehouses.
    /// </summary>
    Warehouses
}
