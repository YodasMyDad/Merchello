namespace Merchello.Core.Payments.Providers.PayPal.Models;

/// <summary>
/// PayPal webhook amount model.
/// </summary>
internal class PayPalWebhookAmount
{
    public string? CurrencyCode { get; set; }
    public string? Value { get; set; }
}
