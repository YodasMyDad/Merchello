using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsPackagingType
{
    /// <summary>
    /// Package type code. 02 = Customer Supplied Package.
    /// </summary>
    [JsonPropertyName("Code")]
    public string Code { get; set; } = "02";

    [JsonPropertyName("Description")]
    public string? Description { get; set; }
}
