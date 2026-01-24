using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSAccountHistory
{
    [JsonPropertyName("createdAt")]
    public string? CreatedAt { get; set; }
}
