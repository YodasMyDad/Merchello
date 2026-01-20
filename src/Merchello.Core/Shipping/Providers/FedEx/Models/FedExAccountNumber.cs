using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.FedEx.Models;

public class FedExAccountNumber
{
    [JsonPropertyName("value")]
    public string Value { get; set; } = null!;
}
