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
