using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsShipmentCharge
{
    [JsonPropertyName("Type")]
    public string? Type { get; set; }

    [JsonPropertyName("BillShipper")]
    public UpsBillShipper? BillShipper { get; set; }
}
