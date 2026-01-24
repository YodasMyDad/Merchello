namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Request to initialize single-page checkout with pre-selected country/state.
/// Used for express checkout flows where shipping location is already known.
/// </summary>
public class InitializeCheckoutRequestDto
{
    /// <summary>
    /// Shipping country code (ISO 3166-1 alpha-2).
    /// </summary>
    public required string CountryCode { get; set; }

    /// <summary>
    /// Shipping state/region code (optional).
    /// </summary>
    public string? StateCode { get; set; }

    /// <summary>
    /// Whether to auto-select shipping. Strategy is determined by store settings.
    /// Defaults to true for single-page and express checkout scenarios.
    /// </summary>
    public bool AutoSelectShipping { get; set; } = true;

    /// <summary>
    /// Optional email for session tracking.
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Previously selected shipping options to restore (groupId -> optionId).
    /// When provided, these selections are validated and used instead of auto-selecting cheapest.
    /// This allows the frontend to persist user's shipping preferences across address changes.
    /// </summary>
    public Dictionary<string, string>? PreviousShippingSelections { get; set; }
}
