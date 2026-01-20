using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

/// <summary>
/// UPS error response wrapper.
/// </summary>
public class UpsErrorResponse
{
    [JsonPropertyName("response")]
    public UpsErrorResponseDetail? Response { get; set; }
}
