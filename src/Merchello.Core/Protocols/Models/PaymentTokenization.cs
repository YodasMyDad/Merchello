namespace Merchello.Core.Protocols.Models;

/// <summary>
/// Tokenization specification for a payment handler.
/// </summary>
public class PaymentTokenization
{
    /// <summary>
    /// Tokenization type: PUSH, PULL
    /// </summary>
    public required string Type { get; init; }

    /// <summary>
    /// Payment gateway (stripe, braintree, etc.)
    /// </summary>
    public string? Gateway { get; init; }

    /// <summary>
    /// Merchant ID at the gateway.
    /// </summary>
    public string? GatewayMerchantId { get; init; }
}
