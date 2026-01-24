using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSDdcRequest
{
    [JsonPropertyName("transactionReference")]
    public string? TransactionReference { get; set; }

    [JsonPropertyName("cardNumber")]
    public string? CardNumber { get; set; }

    [JsonPropertyName("cardExpiryDate")]
    public WorldPayCardExpiryDate? CardExpiryDate { get; set; }
}
