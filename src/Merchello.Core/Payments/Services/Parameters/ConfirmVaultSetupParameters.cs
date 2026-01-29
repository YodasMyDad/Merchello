namespace Merchello.Core.Payments.Services.Parameters;

/// <summary>
/// Parameters for confirming a vault setup and saving the payment method.
/// </summary>
public class ConfirmVaultSetupParameters
{
    /// <summary>
    /// The Merchello customer ID.
    /// </summary>
    public required Guid CustomerId { get; init; }

    /// <summary>
    /// The payment provider alias.
    /// </summary>
    public required string ProviderAlias { get; init; }

    /// <summary>
    /// The setup session ID from CreateVaultSetupSessionAsync.
    /// </summary>
    public required string SetupSessionId { get; init; }

    /// <summary>
    /// Payment method token/nonce from frontend SDK.
    /// </summary>
    public string? PaymentMethodToken { get; init; }

    /// <summary>
    /// The provider's customer ID (from setup session).
    /// </summary>
    public string? ProviderCustomerId { get; init; }

    /// <summary>
    /// Query parameters from redirect return.
    /// </summary>
    public Dictionary<string, string>? RedirectParams { get; init; }

    /// <summary>
    /// Whether to set this as the customer's default payment method.
    /// </summary>
    public bool SetAsDefault { get; init; }

    /// <summary>
    /// IP address of the customer (for consent tracking).
    /// </summary>
    public string? IpAddress { get; init; }
}
