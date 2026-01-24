namespace Merchello.Core.Payments.Providers.PayPal.Models;

/// <summary>
/// PayPal webhook event model for deserialization.
/// </summary>
internal class PayPalWebhookEvent
{
    public string? Id { get; set; }
    public string? EventType { get; set; }
    public string? ResourceType { get; set; }
    public PayPalWebhookResource? Resource { get; set; }
}
