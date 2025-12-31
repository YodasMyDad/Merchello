namespace Merchello.Core.Payments.Models;

/// <summary>
/// Result of creating a payment link from a provider.
/// </summary>
public class PaymentLinkResult
{
    /// <summary>
    /// Whether the payment link was created successfully.
    /// </summary>
    public required bool Success { get; init; }

    /// <summary>
    /// Error message if creation failed.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Error code from the provider.
    /// </summary>
    public string? ErrorCode { get; init; }

    /// <summary>
    /// The shareable payment URL.
    /// </summary>
    public string? PaymentUrl { get; init; }

    /// <summary>
    /// Provider's internal link/invoice ID for subsequent operations (deactivation, lookup).
    /// </summary>
    public string? ProviderLinkId { get; init; }

    /// <summary>
    /// When the link expires (if applicable).
    /// </summary>
    public DateTime? ExpiresAt { get; init; }

    /// <summary>
    /// Creates a failed result.
    /// </summary>
    /// <param name="errorMessage">The error message.</param>
    /// <param name="errorCode">Optional error code from provider.</param>
    public static PaymentLinkResult Failed(string errorMessage, string? errorCode = null) => new()
    {
        Success = false,
        ErrorMessage = errorMessage,
        ErrorCode = errorCode
    };

    /// <summary>
    /// Creates a successful result.
    /// </summary>
    /// <param name="paymentUrl">The shareable payment URL.</param>
    /// <param name="providerLinkId">Provider's link ID for deactivation.</param>
    /// <param name="expiresAt">Optional expiry time.</param>
    public static PaymentLinkResult Created(
        string paymentUrl,
        string providerLinkId,
        DateTime? expiresAt = null) => new()
    {
        Success = true,
        PaymentUrl = paymentUrl,
        ProviderLinkId = providerLinkId,
        ExpiresAt = expiresAt
    };
}
