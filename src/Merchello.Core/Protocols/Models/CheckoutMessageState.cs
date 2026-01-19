namespace Merchello.Core.Protocols.Models;

/// <summary>
/// Protocol-agnostic representation of a validation message.
/// </summary>
public class CheckoutMessageState
{
    /// <summary>
    /// Type: error, warning, info
    /// </summary>
    public required string Type { get; init; }

    /// <summary>
    /// Error code: missing, invalid, out_of_stock, payment_declined, etc.
    /// </summary>
    public required string Code { get; init; }

    /// <summary>
    /// JSONPath to affected field (e.g., $.buyer.email)
    /// </summary>
    public string? Path { get; init; }

    public required string Content { get; init; }

    /// <summary>
    /// Severity: recoverable, requires_buyer_input, requires_buyer_review
    /// </summary>
    public string? Severity { get; init; }
}
