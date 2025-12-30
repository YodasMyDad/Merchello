using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Result DTO for webhook simulation.
/// </summary>
public class WebhookSimulationResultDto
{
    /// <summary>
    /// Whether the simulation was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Whether validation was skipped (test mode).
    /// </summary>
    public bool ValidationSkipped { get; set; }

    /// <summary>
    /// Whether the webhook signature validation passed (if not skipped).
    /// </summary>
    public bool ValidationPassed { get; set; }

    /// <summary>
    /// The Merchello event type that was detected.
    /// </summary>
    public string? EventTypeDetected { get; set; }

    /// <summary>
    /// The provider-specific event type string that was detected.
    /// </summary>
    public string? ProviderEventType { get; set; }

    /// <summary>
    /// List of actions that were performed as a result of processing.
    /// </summary>
    public List<string> ActionsPerformed { get; set; } = [];

    /// <summary>
    /// The payload that was sent to the provider.
    /// </summary>
    public string? Payload { get; set; }

    /// <summary>
    /// Error message if the simulation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Transaction ID from the webhook result.
    /// </summary>
    public string? TransactionId { get; set; }

    /// <summary>
    /// Invoice ID from the webhook result.
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// Amount from the webhook result.
    /// </summary>
    public decimal? Amount { get; set; }
}
