using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.FedEx.Models;

public class FedExRateReplyDetail
{
    [JsonPropertyName("serviceType")]
    public string ServiceType { get; set; } = null!;

    [JsonPropertyName("serviceName")]
    public string? ServiceName { get; set; }

    [JsonPropertyName("packagingType")]
    public string? PackagingType { get; set; }

    [JsonPropertyName("ratedShipmentDetails")]
    public List<FedExRatedShipmentDetail>? RatedShipmentDetails { get; set; }

    [JsonPropertyName("commit")]
    public FedExCommit? Commit { get; set; }
}
