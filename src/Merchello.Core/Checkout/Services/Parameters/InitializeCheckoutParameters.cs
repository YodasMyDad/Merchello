using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for initializing single-page checkout with pre-selected country/state.
/// </summary>
public class InitializeCheckoutParameters
{
    /// <summary>
    /// The basket to initialize checkout for.
    /// </summary>
    public required Basket Basket { get; init; }

    /// <summary>
    /// Shipping country code (ISO 3166-1 alpha-2).
    /// </summary>
    public required string CountryCode { get; init; }

    /// <summary>
    /// Shipping state/region code (optional).
    /// </summary>
    public string? StateCode { get; init; }

    /// <summary>
    /// Whether to auto-select the cheapest shipping option for each group.
    /// </summary>
    public bool AutoSelectCheapestShipping { get; init; } = true;

    /// <summary>
    /// Optional email for session tracking.
    /// </summary>
    public string? Email { get; init; }
}
