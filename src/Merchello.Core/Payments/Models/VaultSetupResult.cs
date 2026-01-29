namespace Merchello.Core.Payments.Models;

/// <summary>
/// Result of creating a vault setup session.
/// </summary>
public class VaultSetupResult
{
    /// <summary>
    /// Whether the setup session was created successfully.
    /// </summary>
    public required bool Success { get; init; }

    /// <summary>
    /// Error message if Success is false.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// The setup session ID (e.g., Stripe SetupIntent ID).
    /// Used for confirmation and tracking.
    /// </summary>
    public string? SetupSessionId { get; init; }

    /// <summary>
    /// Client secret for frontend SDK (e.g., Stripe SetupIntent client secret).
    /// </summary>
    public string? ClientSecret { get; init; }

    /// <summary>
    /// Redirect URL for redirect-based flows (e.g., PayPal approval URL).
    /// </summary>
    public string? RedirectUrl { get; init; }

    /// <summary>
    /// The provider's customer ID (created or retrieved during setup).
    /// Needed for confirmation in some providers.
    /// </summary>
    public string? ProviderCustomerId { get; init; }

    /// <summary>
    /// Additional SDK configuration options for the frontend.
    /// </summary>
    public Dictionary<string, object>? SdkConfig { get; init; }

    /// <summary>
    /// Creates a failed result.
    /// </summary>
    public static VaultSetupResult Failed(string message) => new()
    {
        Success = false,
        ErrorMessage = message
    };

    /// <summary>
    /// Creates a successful result with session ID and optional client secret.
    /// </summary>
    public static VaultSetupResult Succeeded(string sessionId, string? clientSecret = null) => new()
    {
        Success = true,
        SetupSessionId = sessionId,
        ClientSecret = clientSecret
    };
}
