namespace Merchello.Core.Payments.Models;

/// <summary>
/// Request to create a vault setup session for saving a payment method without charging.
/// </summary>
public class VaultSetupRequest
{
    /// <summary>
    /// The Merchello customer ID.
    /// </summary>
    public required Guid CustomerId { get; init; }

    /// <summary>
    /// The customer's email address.
    /// </summary>
    public required string CustomerEmail { get; init; }

    /// <summary>
    /// The customer's name (optional).
    /// </summary>
    public string? CustomerName { get; init; }

    /// <summary>
    /// The payment method alias (e.g., "cards", "paypal").
    /// Optional - defaults to provider's primary method.
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

    /// <summary>
    /// Additional metadata to pass to the provider.
    /// </summary>
    public Dictionary<string, string>? Metadata { get; init; }
}
