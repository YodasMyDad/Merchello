namespace Merchello.Core.Shipping.Models;

/// <summary>
/// Defines the action to take when a postcode rule matches.
/// </summary>
public enum PostcodeRuleAction
{
    /// <summary>
    /// Block delivery to matching postcodes - shipping option will not be available.
    /// </summary>
    Block = 0,

    /// <summary>
    /// Add a flat surcharge to the shipping cost for matching postcodes.
    /// </summary>
    Surcharge = 10
}
