namespace Merchello.Core.Webhooks.Dtos;

/// <summary>
/// DTO for webhook delivery statistics.
/// </summary>
public class WebhookStatsDto
{
    public int TotalSubscriptions { get; set; }
    public int ActiveSubscriptions { get; set; }
    public int TotalDeliveries { get; set; }
    public int SuccessfulDeliveries { get; set; }
    public int FailedDeliveries { get; set; }
    public int PendingDeliveries { get; set; }
    public int AbandonedDeliveries { get; set; }
    public double SuccessRate { get; set; }
    public double AverageResponseTimeMs { get; set; }
    public DateTime? LastDeliveryUtc { get; set; }
}

/// <summary>
/// DTO for ping/test webhook request.
/// </summary>
public class PingWebhookDto
{
    public string Url { get; set; } = string.Empty;
}

/// <summary>
/// DTO for webhook delivery result returned by test/ping endpoints.
/// </summary>
public class WebhookDeliveryResultDto
{
    public bool Success { get; set; }
    public int? StatusCode { get; set; }
    public string? ResponseBody { get; set; }
    public string? ErrorMessage { get; set; }
    public int DurationMs { get; set; }
    public Guid? DeliveryId { get; set; }
}
