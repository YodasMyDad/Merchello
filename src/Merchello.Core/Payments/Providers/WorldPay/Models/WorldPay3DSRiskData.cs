using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSRiskData
{
    [JsonPropertyName("account")]
    public WorldPay3DSAccount? Account { get; set; }
}
