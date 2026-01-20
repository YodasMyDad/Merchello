using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.FedEx.Models;

public class FedExCommit
{
    [JsonPropertyName("dateDetail")]
    public FedExDateDetail? DateDetail { get; set; }

    [JsonPropertyName("transitDays")]
    public string? TransitDays { get; set; }
}
