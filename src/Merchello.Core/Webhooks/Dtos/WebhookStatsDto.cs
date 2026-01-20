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
