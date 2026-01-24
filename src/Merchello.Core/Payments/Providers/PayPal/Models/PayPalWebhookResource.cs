namespace Merchello.Core.Payments.Providers.PayPal.Models;

/// <summary>
/// PayPal webhook resource model.
/// </summary>
internal class PayPalWebhookResource
{
    public string? Id { get; set; }
    public string? Status { get; set; }
    public string? CustomId { get; set; }
    public PayPalWebhookAmount? Amount { get; set; }
    public List<PayPalWebhookPurchaseUnit>? PurchaseUnits { get; set; }
}
