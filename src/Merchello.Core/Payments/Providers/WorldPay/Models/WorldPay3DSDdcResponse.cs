using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSDdcResponse
{
    [JsonPropertyName("outcome")]
    public string? Outcome { get; set; }

    [JsonPropertyName("deviceDataCollection")]
    public WorldPayDeviceDataCollection? DeviceDataCollection { get; set; }
}
