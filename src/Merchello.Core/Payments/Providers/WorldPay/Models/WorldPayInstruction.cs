using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPayInstruction
{
    [JsonPropertyName("narrative")]
    public WorldPayNarrative? Narrative { get; set; }

    [JsonPropertyName("value")]
    public WorldPayValue? Value { get; set; }

    [JsonPropertyName("paymentInstrument")]
    public WorldPayPaymentInstrument? PaymentInstrument { get; set; }

    [JsonPropertyName("customerAuthentication")]
    public WorldPayCustomerAuthentication? CustomerAuthentication { get; set; }
}
