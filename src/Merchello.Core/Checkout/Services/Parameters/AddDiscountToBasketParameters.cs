using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for adding a discount to a basket
/// </summary>
public class AddDiscountToBasketParameters
{
    /// <summary>
    /// The basket to add the discount to
    /// </summary>
    public required Basket Basket { get; init; }

    /// <summary>
    /// The discount amount (positive value)
    /// </summary>
    public required decimal Amount { get; init; }

    /// <summary>
    /// Whether this is a fixed amount, percentage, or free discount
    /// </summary>
    public required DiscountValueType DiscountValueType { get; init; }

    /// <summary>
    /// Optional SKU to link the discount to a specific product
    /// </summary>
    public string? LinkedSku { get; init; }

    /// <summary>
    /// Optional name for the discount
    /// </summary>
    public string? Name { get; init; }

    /// <summary>
    /// Optional reason/description for the discount
    /// </summary>
    public string? Reason { get; init; }

    /// <summary>
    /// Country code for tax calculation
    /// </summary>
    public string? CountryCode { get; init; }
}
