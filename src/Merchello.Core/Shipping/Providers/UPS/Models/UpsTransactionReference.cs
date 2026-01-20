using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsTransactionReference
{
    [JsonPropertyName("CustomerContext")]
    public string? CustomerContext { get; set; }
}
