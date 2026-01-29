namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to confirm a vault setup and save the payment method.
/// </summary>
public class VaultConfirmRequestDto
{
    /// <summary>
    /// The payment provider alias.
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The setup session ID from the vault setup response.
    /// </summary>
    public required string SetupSessionId { get; set; }

    /// <summary>
    /// Payment method token/nonce from frontend SDK.
    /// Required for some providers (Braintree).
    /// </summary>
    public string? PaymentMethodToken { get; set; }

    /// <summary>
    /// The provider's customer ID (from setup session).
    /// Required for some providers.
    /// </summary>
    public string? ProviderCustomerId { get; set; }

    /// <summary>
    /// Whether to set this as the customer's default payment method.
    /// </summary>
    public bool SetAsDefault { get; set; }
}
