using System.Text.Json.Serialization;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// The current status of a discount.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DiscountStatus
{
    /// <summary>
    /// Discount is in draft mode and not yet active.
    /// </summary>
    Draft,

    /// <summary>
    /// Discount is currently active and can be used.
    /// </summary>
    Active,

    /// <summary>
    /// Discount is scheduled to become active in the future.
    /// </summary>
    Scheduled,

    /// <summary>
    /// Discount has expired and can no longer be used.
    /// </summary>
    Expired,

    /// <summary>
    /// Discount has been manually disabled.
    /// </summary>
    Disabled
}

/// <summary>
/// The category/type of discount.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DiscountCategory
{
    /// <summary>
    /// Discount applies to specific products or collections.
    /// </summary>
    AmountOffProducts,

    /// <summary>
    /// Buy X items, get Y items at a discount.
    /// </summary>
    BuyXGetY,

    /// <summary>
    /// Discount applies to the entire order total.
    /// </summary>
    AmountOffOrder,

    /// <summary>
    /// Free or discounted shipping.
    /// </summary>
    FreeShipping
}

/// <summary>
/// How the discount is applied.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DiscountMethod
{
    /// <summary>
    /// Customer must enter a discount code.
    /// </summary>
    Code,

    /// <summary>
    /// Discount is automatically applied when conditions are met.
    /// </summary>
    Automatic
}

/// <summary>
/// Minimum requirement type for discount eligibility.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DiscountRequirementType
{
    /// <summary>
    /// No minimum requirement.
    /// </summary>
    None,

    /// <summary>
    /// Minimum purchase amount required.
    /// </summary>
    MinimumPurchaseAmount,

    /// <summary>
    /// Minimum quantity of items required.
    /// </summary>
    MinimumQuantity
}

/// <summary>
/// What the discount targets (products, categories, etc.).
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
    /// Applies to products in specific categories.
    /// </summary>
    Categories,

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

/// <summary>
/// Who is eligible to use the discount.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DiscountEligibilityType
{
    /// <summary>
    /// All customers are eligible.
    /// </summary>
    AllCustomers,

    /// <summary>
    /// Only customers in specific segments are eligible.
    /// </summary>
    CustomerSegments,

    /// <summary>
    /// Only specific customers are eligible.
    /// </summary>
    SpecificCustomers
}

/// <summary>
/// Trigger type for Buy X Get Y discounts.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum BuyXTriggerType
{
    /// <summary>
    /// Trigger based on minimum quantity of items.
    /// </summary>
    MinimumQuantity,

    /// <summary>
    /// Trigger based on minimum purchase amount.
    /// </summary>
    MinimumPurchaseAmount
}

/// <summary>
/// How to select items for the "Get" portion of Buy X Get Y discounts.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum BuyXGetYSelectionMethod
{
    /// <summary>
    /// Discount the cheapest qualifying items first.
    /// </summary>
    Cheapest,

    /// <summary>
    /// Discount the most expensive qualifying items first.
    /// </summary>
    MostExpensive
}

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
