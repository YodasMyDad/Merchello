namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// DTO for processing a test payment in the backoffice.
/// </summary>
public class ProcessTestPaymentDto
{
    /// <summary>
    /// The payment method alias (e.g., "cards", "paypal").
    /// </summary>
    public string? MethodAlias { get; set; }

    /// <summary>
    /// Session ID from the payment session.
    /// </summary>
    public string? SessionId { get; set; }

    /// <summary>
    /// Payment method token from the SDK (e.g., nonce, payment method ID).
    /// </summary>
    public string? PaymentMethodToken { get; set; }

    /// <summary>
    /// Form data for DirectForm integration types.
    /// </summary>
    public Dictionary<string, string>? FormData { get; set; }

    /// <summary>
    /// Amount to charge.
    /// </summary>
    public decimal Amount { get; set; } = 100m;

    /// <summary>
    /// Test invoice ID from the test session.
    /// Ensures the same invoice ID is used across session creation and payment processing.
    /// </summary>
    public Guid? TestInvoiceId { get; set; }
}
