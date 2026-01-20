using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsBillShipper
{
    [JsonPropertyName("AccountNumber")]
    public string? AccountNumber { get; set; }
}
