using Merchello.Core.Accounting.Models;
using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Services.Interfaces;

/// <summary>
/// Engine for calculating and applying discounts to orders.
/// </summary>
public interface IDiscountEngine
{
    /// <summary>
    /// Gets all applicable automatic discounts for the given context.
    /// </summary>
    /// <param name="context">The discount context.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>List of applicable automatic discounts with calculated amounts.</returns>
    Task<List<ApplicableDiscount>> GetApplicableAutomaticDiscountsAsync(
        DiscountContext context,
        CancellationToken ct = default);

    /// <summary>
    /// Validates a discount code for the given context.
    /// </summary>
    /// <param name="code">The discount code to validate.</param>
    /// <param name="context">The discount context.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Validation result with discount if valid.</returns>
    Task<DiscountValidationResult> ValidateCodeAsync(
        string code,
        DiscountContext context,
        CancellationToken ct = default);

    /// <summary>
    /// Calculates the discount amount for a single discount.
    /// </summary>
    /// <param name="discount">The discount to calculate.</param>
    /// <param name="context">The discount context.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Calculation result with amounts.</returns>
    Task<DiscountCalculationResult> CalculateAsync(
        Discount discount,
        DiscountContext context,
        CancellationToken ct = default);

    /// <summary>
    /// Applies multiple discounts to line items and returns the result.
    /// </summary>
    /// <param name="discounts">The discounts to apply.</param>
    /// <param name="lineItems">The line items to apply discounts to.</param>
    /// <param name="context">The discount context.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Result with applied discounts and discounted line items.</returns>
    Task<ApplyDiscountsResult> ApplyDiscountsAsync(
        List<Discount> discounts,
        List<LineItem> lineItems,
        DiscountContext context,
        CancellationToken ct = default);

    /// <summary>
    /// Checks if two discounts can be combined.
    /// </summary>
    /// <param name="discount1">The first discount.</param>
    /// <param name="discount2">The second discount.</param>
    /// <returns>True if the discounts can be combined.</returns>
    bool CanCombine(Discount discount1, Discount discount2);

    /// <summary>
    /// Filters a list of discounts to only include those that can be combined with each other.
    /// Discounts are sorted by priority (lowest first) and only discounts that can combine
    /// with all previously selected discounts are included.
    /// </summary>
    /// <param name="discounts">The discounts to filter.</param>
    /// <returns>List of discounts that can be combined together.</returns>
    List<Discount> FilterCombinableDiscounts(List<Discount> discounts);
}
