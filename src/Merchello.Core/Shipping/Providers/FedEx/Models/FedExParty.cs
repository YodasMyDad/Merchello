using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.FedEx.Models;

public class FedExParty
{
    [JsonPropertyName("address")]
    public FedExAddress Address { get; set; } = null!;
}
