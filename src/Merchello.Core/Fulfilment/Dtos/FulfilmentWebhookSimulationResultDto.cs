namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// Result of a simulated fulfilment webhook.
/// </summary>
public class FulfilmentWebhookSimulationResultDto
{
    /// <summary>
    /// Whether simulation succeeded.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Event type detected by provider parser.
    /// </summary>
    public string? EventTypeDetected { get; set; }

    /// <summary>
    /// Actions performed during simulation processing.
    /// </summary>
    public List<string> ActionsPerformed { get; set; } = [];

    /// <summary>
    /// Payload that was processed.
    /// </summary>
    public string? Payload { get; set; }

    /// <summary>
    /// Error message when simulation fails.
    /// </summary>
    public string? ErrorMessage { get; set; }
}
