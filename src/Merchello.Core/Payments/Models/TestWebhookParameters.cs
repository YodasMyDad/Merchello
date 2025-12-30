namespace Merchello.Core.Payments.Models;

/// <summary>
/// Parameters for generating a test webhook payload.
/// </summary>
public class TestWebhookParameters
{
    /// <summary>
    /// The event type to simulate.
    /// </summary>
    public required string EventType { get; init; }

    /// <summary>
    /// Optional transaction ID (will be auto-generated if not provided).
    /// </summary>
    public string? TransactionId { get; init; }

    /// <summary>
    /// Optional invoice ID for the simulated event.
    /// </summary>
    public Guid? InvoiceId { get; init; }

    /// <summary>
    /// Amount for the simulated event.
    /// </summary>
    public decimal Amount { get; init; } = 100m;

    /// <summary>
    /// Currency code for the simulated event.
    /// </summary>
    public string Currency { get; init; } = "USD";

    /// <summary>
    /// Optional custom payload JSON (for advanced testing).
    /// If provided, this overrides the generated payload.
    /// </summary>
    public string? CustomPayload { get; init; }
}
