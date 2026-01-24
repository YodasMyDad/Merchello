using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSAuthRequest
{
    [JsonPropertyName("transactionReference")]
    public string? TransactionReference { get; set; }

    [JsonPropertyName("merchant")]
    public WorldPayMerchant? Merchant { get; set; }

    [JsonPropertyName("instruction")]
    public WorldPay3DSInstruction? Instruction { get; set; }

    [JsonPropertyName("deviceData")]
    public WorldPay3DSDeviceData? DeviceData { get; set; }

    [JsonPropertyName("challenge")]
    public WorldPay3DSChallenge? Challenge { get; set; }

    [JsonPropertyName("riskData")]
    public WorldPay3DSRiskData? RiskData { get; set; }
}
