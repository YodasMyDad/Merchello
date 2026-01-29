namespace Merchello.Core.Payments.Services.Parameters;

/// <summary>
/// Parameters for creating a vault setup session.
/// </summary>
public class CreateVaultSetupParameters
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
    /// The payment method alias (optional).
    /// </summary>
    public string? MethodAlias { get; init; }

    /// <summary>
    /// Return URL for redirect-based flows.
    /// </summary>
    public string? ReturnUrl { get; init; }

    /// <summary>
    /// Cancel URL for redirect-based flows.
    /// </summary>
    public string? CancelUrl { get; init; }

    /// <summary>
    /// IP address of the customer (for consent tracking).
    /// </summary>
    public string? IpAddress { get; init; }
}
