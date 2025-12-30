namespace Merchello.Core.Payments.Models;

/// <summary>
/// Result of simulating a webhook event.
/// </summary>
public class WebhookSimulationResult
{
    /// <summary>
    /// Whether the simulation was successful.
    /// </summary>
    public bool Success { get; init; }

    /// <summary>
    /// Whether the webhook signature validation passed.
    /// For simulations, this tests the provider's validation logic.
    /// </summary>
    public bool ValidationPassed { get; init; }

    /// <summary>
    /// The event type that was detected by the provider.
    /// </summary>
    public WebhookEventType? EventTypeDetected { get; init; }

    /// <summary>
    /// The provider-specific event type string that was detected.
    /// </summary>
    public string? ProviderEventType { get; init; }

    /// <summary>
    /// List of actions that were performed as a result of processing the webhook.
    /// </summary>
    public List<string> ActionsPerformed { get; init; } = [];

    /// <summary>
    /// The generated webhook payload that was sent to the provider.
    /// </summary>
    public string? GeneratedPayload { get; init; }

    /// <summary>
    /// The generated headers that were sent with the webhook.
    /// </summary>
    public Dictionary<string, string>? GeneratedHeaders { get; init; }

    /// <summary>
    /// Error message if the simulation failed.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// The webhook processing result from the provider.
    /// </summary>
    public WebhookProcessingResult? ProcessingResult { get; init; }

    /// <summary>
    /// Creates a successful simulation result.
    /// </summary>
    public static WebhookSimulationResult Successful(
        WebhookEventType eventType,
        string providerEventType,
        string generatedPayload,
        Dictionary<string, string>? headers = null,
        List<string>? actions = null,
        WebhookProcessingResult? processingResult = null) => new()
    {
        Success = true,
        ValidationPassed = true,
        EventTypeDetected = eventType,
        ProviderEventType = providerEventType,
        GeneratedPayload = generatedPayload,
        GeneratedHeaders = headers,
        ActionsPerformed = actions ?? [],
        ProcessingResult = processingResult
    };

    /// <summary>
    /// Creates a validation failure result.
    /// </summary>
    public static WebhookSimulationResult ValidationFailed(string errorMessage, string? payload = null) => new()
    {
        Success = false,
        ValidationPassed = false,
        ErrorMessage = errorMessage,
        GeneratedPayload = payload
    };

    /// <summary>
    /// Creates a processing failure result.
    /// </summary>
    public static WebhookSimulationResult ProcessingFailed(string errorMessage, string? payload = null) => new()
    {
        Success = false,
        ValidationPassed = true,
        ErrorMessage = errorMessage,
        GeneratedPayload = payload
    };
}
