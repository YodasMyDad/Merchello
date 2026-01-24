using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSPaymentInstrument
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("sessionState")]
    public string? SessionState { get; set; }

    [JsonPropertyName("cardHolderName")]
    public string? CardHolderName { get; set; }

    [JsonPropertyName("billingAddress")]
    public WorldPay3DSBillingAddress? BillingAddress { get; set; }
}
