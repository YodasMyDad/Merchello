using Merchello.Core.Shared.Services.Interfaces;

namespace Merchello.Core.Shared.Extensions;

public static class TaxExtensions
{
    /// <summary>
    /// Returns the amount to add/remove from a figure from a %
    /// </summary>
    /// <param name="amount">Amount to tax</param>
    /// <param name="taxRate">The tax rate</param>
    /// <param name="rounding">Type of rounding (defaults to AwayFromZero for commerce)</param>
    /// <param name="round">Round the result</param>
    /// <returns></returns>
    /// <remarks>Uses hardcoded 2 decimal places. For multi-currency support, use the overload with ICurrencyService.</remarks>
    public static decimal PercentageAmount(this decimal amount, decimal taxRate, MidpointRounding rounding = MidpointRounding.AwayFromZero, bool round = true)
    {
        if (taxRate <= 0)
        {
            return amount;
        }

        var calculatedAmount = (amount / 100) * taxRate;

        if (!round)
        {
            return calculatedAmount;
        }

        return Math.Round(calculatedAmount, 2, rounding);
    }

    /// <summary>
    /// Returns the amount to add/remove from a figure from a % with currency-aware rounding.
    /// </summary>
    /// <param name="amount">Amount to tax</param>
    /// <param name="taxRate">The tax rate</param>
    /// <param name="currencyCode">ISO 4217 currency code for proper decimal place rounding (e.g., JPY has 0 decimals)</param>
    /// <param name="currencyService">The currency service for rounding</param>
    /// <returns>The calculated tax amount rounded to the currency's decimal places</returns>
    public static decimal PercentageAmount(this decimal amount, decimal taxRate, string currencyCode, ICurrencyService currencyService)
    {
        if (taxRate <= 0)
        {
            return amount;
        }

        var calculatedAmount = (amount / 100) * taxRate;
        return currencyService.Round(calculatedAmount, currencyCode);
    }

    /// <summary>
    /// Adjust a number by a percentage
    /// </summary>
    /// <param name="figure"></param>
    /// <param name="percentage"></param>
    /// <returns></returns>
    public static decimal AdjustByPercentage(this decimal figure, decimal percentage)
    {
        // Calculate the adjustment
        var adjustment = figure * percentage / 100;

        // Apply the adjustment
        return figure + adjustment;
    }

    /// <summary>
    /// Rounds up
    /// </summary>
    /// <param name="input"></param>
    /// <param name="places"></param>
    /// <returns></returns>
    public static double RoundUp(double input, int places)
    {
        double multiplier = Math.Pow(10, Convert.ToDouble(places));
        return Math.Ceiling(input * multiplier) / multiplier;
    }
}
