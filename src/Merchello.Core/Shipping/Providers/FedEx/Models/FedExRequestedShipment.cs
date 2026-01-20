using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.FedEx.Models;

public class FedExRequestedShipment
{
    [JsonPropertyName("shipper")]
    public FedExParty Shipper { get; set; } = null!;

    [JsonPropertyName("recipient")]
    public FedExParty Recipient { get; set; } = null!;

    [JsonPropertyName("pickupType")]
    public string PickupType { get; set; } = "DROPOFF_AT_FEDEX_LOCATION";

    [JsonPropertyName("serviceType")]
    public string? ServiceType { get; set; }

    [JsonPropertyName("packagingType")]
    public string PackagingType { get; set; } = "YOUR_PACKAGING";

    [JsonPropertyName("rateRequestType")]
    public List<string> RateRequestType { get; set; } = ["ACCOUNT", "LIST"];

    [JsonPropertyName("requestedPackageLineItems")]
    public List<FedExPackageLineItem> RequestedPackageLineItems { get; set; } = [];
}
