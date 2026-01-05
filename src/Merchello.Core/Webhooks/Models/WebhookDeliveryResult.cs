namespace Merchello.Core.Webhooks.Models;

/// <summary>
/// Result of a webhook delivery attempt.
/// </summary>
public class WebhookDeliveryResult
{
    /// <summary>
    /// Whether the delivery was successful (2xx response).
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// HTTP status code from the response.
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
    /// Request duration in milliseconds.
    /// </summary>
    public int DurationMs { get; set; }

    /// <summary>
    /// The delivery ID.
    /// </summary>
    public Guid? DeliveryId { get; set; }
}
