namespace Merchello.Core.Shipping.Models;

/// <summary>
/// Speed tier classification for bridging carrier rates to 3PL shipping methods.
/// Inferred from carrier-reported transit times (not hardcoded to service codes).
/// </summary>
public enum ShippingServiceCategory
{
    /// <summary>Ground/standard delivery (4-7 business days).</summary>
    Standard = 0,
    /// <summary>Budget/slow delivery (8+ business days).</summary>
    Economy = 10,
    /// <summary>2-3 day express delivery.</summary>
    Express = 20,
    /// <summary>Next business day delivery.</summary>
    Overnight = 30
}
