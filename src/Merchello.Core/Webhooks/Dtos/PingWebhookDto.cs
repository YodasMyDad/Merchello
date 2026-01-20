namespace Merchello.Core.Webhooks.Dtos;

/// <summary>
/// DTO for ping/test webhook request.
/// </summary>
public class PingWebhookDto
{
    public string Url { get; set; } = string.Empty;
}
