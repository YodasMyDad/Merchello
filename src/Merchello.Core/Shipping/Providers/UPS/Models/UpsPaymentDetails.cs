using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsPaymentDetails
{
    [JsonPropertyName("ShipmentCharge")]
    public List<UpsShipmentCharge>? ShipmentCharge { get; set; }
}
