namespace Merchello.Core.Fulfilment.Providers.ShipBob;

/// <summary>
/// Result of webhook signature validation.
/// </summary>
public sealed record ShipBobWebhookValidationResult
{
    /// <summary>
    /// Whether the signature is valid.
    /// </summary>
    public bool IsValid { get; init; }

    /// <summary>
    /// Unique message ID for deduplication.
    /// </summary>
    public string? MessageId { get; init; }

    /// <summary>
    /// Error message if validation failed.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Creates a successful validation result.
    /// </summary>
    public static ShipBobWebhookValidationResult Success(string messageId) =>
        new() { IsValid = true, MessageId = messageId };

    /// <summary>
    /// Creates a failed validation result.
    /// </summary>
    public static ShipBobWebhookValidationResult Failure(string error) =>
        new() { IsValid = false, ErrorMessage = error };
}
