namespace Merchello.Core.Protocols.Models;

/// <summary>
/// Protocol-agnostic representation of a payment handler.
/// </summary>
public class ProtocolPaymentHandler
{
    /// <summary>
    /// Unique handler identifier (e.g., "stripe:card", "com.google.pay").
    /// </summary>
    public required string HandlerId { get; init; }

    /// <summary>
    /// Display name for the payment method.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Handler type: redirect, tokenized, wallet, form
    /// </summary>
    public required string Type { get; init; }

    /// <summary>
    /// Whether this handler supports express checkout flows.
    /// </summary>
    public bool SupportsExpressCheckout { get; init; }

    /// <summary>
    /// Supported instrument schemas (card_payment_instrument, etc.).
    /// </summary>
    public IReadOnlyList<string>? InstrumentSchemas { get; init; }

    /// <summary>
    /// Protocol-specific configuration (e.g., Google Pay config).
    /// </summary>
    public object? Config { get; init; }

    /// <summary>
    /// Tokenization specification for the handler.
    /// </summary>
    public PaymentTokenization? Tokenization { get; init; }
}

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
