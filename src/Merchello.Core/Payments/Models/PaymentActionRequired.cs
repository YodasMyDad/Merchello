namespace Merchello.Core.Payments.Models;

/// <summary>
/// Details about an action required to complete a payment.
/// </summary>
public class PaymentActionRequired
{
    /// <summary>
    /// Type of action required (e.g., "3ds_challenge", "redirect", "confirm").
    /// </summary>
    public required string Type { get; init; }

    /// <summary>
    /// URL to redirect the customer to (for redirect-based actions).
    /// </summary>
    public string? RedirectUrl { get; init; }

    /// <summary>
    /// URL for 3DS challenge iframe.
    /// </summary>
    public string? ChallengeUrl { get; init; }

    /// <summary>
    /// Additional data needed for the action (provider-specific).
    /// </summary>
    public Dictionary<string, string?>? ChallengeData { get; init; }

    /// <summary>
    /// Client secret or token needed for client-side confirmation.
    /// </summary>
    public string? ClientSecret { get; init; }
}
