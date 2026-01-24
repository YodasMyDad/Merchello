using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSLinks
{
    [JsonPropertyName("3ds:verify")]
    public WorldPayLink? Verify { get; set; }
}
