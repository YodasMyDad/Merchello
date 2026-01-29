namespace Merchello.Core.Payments.Models;

/// <summary>
/// Request to confirm a vault setup and save the payment method.
/// </summary>
public class VaultConfirmRequest
{
    /// <summary>
    /// The Merchello customer ID.
    /// </summary>
    public required Guid CustomerId { get; init; }

    /// <summary>
    /// The setup session ID from CreateVaultSetupSessionAsync.
    /// </summary>
    public required string SetupSessionId { get; init; }

    /// <summary>
    /// Payment method token/nonce from frontend SDK tokenization.
    /// Required for some providers (Braintree).
    /// </summary>
    public string? PaymentMethodToken { get; init; }

    /// <summary>
    /// The provider's customer ID.
    /// Required for some providers (Braintree) to vault the payment method.
    /// </summary>
    public string? ProviderCustomerId { get; init; }

    /// <summary>
    /// Query parameters from redirect return (for redirect-based flows).
    /// </summary>
    public Dictionary<string, string>? RedirectParams { get; init; }

    /// <summary>
    /// Whether the customer has given consent to save their payment method.
    /// </summary>
    public bool ConsentGiven { get; init; } = true;

    /// <summary>
    /// Whether to set this as the customer's default payment method.
    /// </summary>
    public bool SetAsDefault { get; init; }
}
