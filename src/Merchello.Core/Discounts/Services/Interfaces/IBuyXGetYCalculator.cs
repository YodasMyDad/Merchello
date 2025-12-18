using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Services.Interfaces;

/// <summary>
/// Calculator for Buy X Get Y discount calculations.
/// </summary>
public interface IBuyXGetYCalculator
{
    /// <summary>
    /// Calculates the Buy X Get Y discount for the given context.
    /// </summary>
    /// <param name="discount">The discount with BuyXGetYConfig.</param>
    /// <param name="context">The discount context.</param>
    /// <returns>Calculation result with discounted items.</returns>
    DiscountCalculationResult Calculate(Discount discount, DiscountContext context);
}
