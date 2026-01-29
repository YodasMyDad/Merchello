namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Response from creating a vault setup session.
/// </summary>
public class VaultSetupResponseDto
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
    /// The setup session ID.
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
    /// The provider's customer ID.
    /// </summary>
    public string? ProviderCustomerId { get; init; }

    /// <summary>
    /// Additional SDK configuration options for the frontend.
    /// </summary>
    public Dictionary<string, object>? SdkConfig { get; init; }
}
