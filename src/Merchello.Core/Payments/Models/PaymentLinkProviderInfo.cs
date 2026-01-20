namespace Merchello.Core.Payments.Models;

/// <summary>
/// Information about a payment provider that supports payment links.
/// </summary>
public class PaymentLinkProviderInfo
{
    /// <summary>
    /// Provider alias (e.g., "stripe", "paypal").
    /// </summary>
    public required string Alias { get; init; }

    /// <summary>
    /// Display name for the provider.
    /// </summary>
    public required string DisplayName { get; init; }

    /// <summary>
    /// Optional icon HTML/SVG for the provider.
    /// </summary>
    public string? IconHtml { get; init; }
}
