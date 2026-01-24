using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSInstruction
{
    [JsonPropertyName("paymentInstrument")]
    public WorldPay3DSPaymentInstrument? PaymentInstrument { get; set; }

    [JsonPropertyName("value")]
    public WorldPayValue? Value { get; set; }
}
