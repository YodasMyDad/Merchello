namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request DTO for testing vault confirm in the backoffice.
/// </summary>
public class TestVaultConfirmRequestDto
{
    /// <summary>
    /// The setup session ID from CreateVaultSetupSessionAsync.
    /// </summary>
    public string? SetupSessionId { get; init; }

    /// <summary>
    /// Payment method token from the SDK (e.g., Stripe PaymentMethod ID, Braintree nonce).
    /// </summary>
    public string? PaymentMethodToken { get; init; }

    /// <summary>
    /// Provider-side customer ID (required by some providers like Braintree).
    /// </summary>
    public string? ProviderCustomerId { get; init; }
}
