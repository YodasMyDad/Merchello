namespace Merchello.Core.Webhooks.Models;

/// <summary>
/// Result of an outbound delivery attempt (webhook or email).
/// </summary>
public class OutboundDeliveryResult
{
    /// <summary>
    /// Whether the delivery was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// HTTP status code from the response (for webhooks).
    /// </summary>
    public int? StatusCode { get; set; }

    /// <summary>
    /// Response body (truncated if large).
    /// </summary>
    public string? ResponseBody { get; set; }

    /// <summary>
    /// Response headers as JSON.
    /// </summary>
    public string? ResponseHeaders { get; set; }

    /// <summary>
    /// Error message if delivery failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Request/send duration in milliseconds.
    /// </summary>
    public int DurationMs { get; set; }

    /// <summary>
    /// The delivery ID.
    /// </summary>
    public Guid? DeliveryId { get; set; }
}
