using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsErrorResponseDetail
{
    [JsonPropertyName("errors")]
    public List<UpsError>? Errors { get; set; }
}
