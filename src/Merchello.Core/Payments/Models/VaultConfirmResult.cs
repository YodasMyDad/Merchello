namespace Merchello.Core.Payments.Models;

/// <summary>
/// Result of confirming a vault setup and saving the payment method.
/// Contains the details needed to create a SavedPaymentMethod record.
/// </summary>
public class VaultConfirmResult
{
    /// <summary>
    /// Whether the confirmation was successful.
    /// </summary>
    public required bool Success { get; init; }

    /// <summary>
    /// Error message if Success is false.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// The provider's payment method ID/token.
    /// This is the reference used to charge this payment method.
    /// </summary>
    public string? ProviderMethodId { get; init; }

    /// <summary>
    /// The provider's customer ID.
    /// </summary>
    public string? ProviderCustomerId { get; init; }

    /// <summary>
    /// The type of payment method.
    /// </summary>
    public SavedPaymentMethodType MethodType { get; init; }

    /// <summary>
    /// The card brand (e.g., "visa", "mastercard").
    /// </summary>
    public string? CardBrand { get; init; }

    /// <summary>
    /// The last 4 digits of the card/account.
    /// </summary>
    public string? Last4 { get; init; }

    /// <summary>
    /// The card expiry month (1-12).
    /// </summary>
    public int? ExpiryMonth { get; init; }

    /// <summary>
    /// The card expiry year (4 digits).
    /// </summary>
    public int? ExpiryYear { get; init; }

    /// <summary>
    /// Human-readable display label (e.g., "Visa ending in 4242").
    /// </summary>
    public string? DisplayLabel { get; init; }

    /// <summary>
    /// Additional provider-specific data.
    /// </summary>
    public Dictionary<string, object>? ExtendedData { get; init; }

    /// <summary>
    /// Creates a failed result.
    /// </summary>
    public static VaultConfirmResult Failed(string message) => new()
    {
        Success = false,
        ErrorMessage = message
    };
}
