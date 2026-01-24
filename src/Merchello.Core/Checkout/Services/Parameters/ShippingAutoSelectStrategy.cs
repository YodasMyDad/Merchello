namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Strategy for auto-selecting shipping options.
/// </summary>
public enum ShippingAutoSelectStrategy
{
    /// <summary>
    /// Select the cheapest option, with faster delivery as tie-breaker.
    /// </summary>
    Cheapest = 0,

    /// <summary>
    /// Select the fastest option, with cheaper cost as tie-breaker.
    /// </summary>
    Fastest = 1,

    /// <summary>
    /// Select the cheapest option, then the fastest among equally priced options.
    /// </summary>
    CheapestThenFastest = 2
}
