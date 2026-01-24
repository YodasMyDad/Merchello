namespace Merchello.Core.Payments.Providers.PayPal.Models;

/// <summary>
/// PayPal webhook purchase unit model.
/// </summary>
internal class PayPalWebhookPurchaseUnit
{
    public string? ReferenceId { get; set; }
    public string? CustomId { get; set; }
}
