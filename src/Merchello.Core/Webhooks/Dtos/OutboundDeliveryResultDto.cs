namespace Merchello.Core.Webhooks.Dtos;

/// <summary>
/// DTO for outbound delivery result returned by test/ping endpoints.
/// </summary>
public class OutboundDeliveryResultDto
{
    public bool Success { get; set; }
    public int? StatusCode { get; set; }
    public string? ResponseBody { get; set; }
    public string? ErrorMessage { get; set; }
    public int DurationMs { get; set; }
    public Guid? DeliveryId { get; set; }
}
