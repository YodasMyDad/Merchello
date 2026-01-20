namespace Merchello.Core.Webhooks.Dtos;

/// <summary>
/// DTO for outbound delivery details including request/response bodies.
/// </summary>
public class OutboundDeliveryDetailDto : OutboundDeliveryDto
{
    // Webhook-specific
    public string? TargetUrl { get; set; }
    public string? RequestBody { get; set; }
    public string? RequestHeaders { get; set; }
    public string? ResponseBody { get; set; }
    public string? ResponseHeaders { get; set; }

    // Email-specific
    public string? EmailRecipients { get; set; }
    public string? EmailSubject { get; set; }
    public string? EmailFrom { get; set; }
    public string? EmailBody { get; set; }
}
