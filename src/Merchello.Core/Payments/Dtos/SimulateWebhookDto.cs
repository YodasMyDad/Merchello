namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// DTO for simulating a webhook event.
/// </summary>
public class SimulateWebhookDto
{
    /// <summary>
    /// The provider-specific event type to simulate (e.g., "checkout.session.completed").
    /// </summary>
    public required string EventType { get; set; }

    /// <summary>
    /// Optional transaction ID (will be auto-generated if not provided).
    /// </summary>
    public string? TransactionId { get; set; }

    /// <summary>
    /// Optional invoice ID for the simulated event.
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// Amount for the simulated event.
    /// </summary>
    public decimal Amount { get; set; } = 100m;

    /// <summary>
    /// Optional custom payload JSON (for advanced testing).
    /// If provided, this overrides the generated payload.
    /// </summary>
    public string? CustomPayload { get; set; }
}
