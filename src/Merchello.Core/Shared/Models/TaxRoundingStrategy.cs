namespace Merchello.Core.Shared.Models;

/// <summary>
/// Defines the strategy used for rounding tax calculations
/// </summary>
public enum TaxRoundingStrategy
{
    /// <summary>
    /// Standard rounding using Math.Round (most common)
    /// </summary>
    Round,

    /// <summary>
    /// Always round up using Math.Ceiling (e.g., US sales tax in some jurisdictions)
    /// </summary>
    Ceiling
}

