using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsArrival
{
    /// <summary>
    /// Arrival date in YYYYMMDD format.
    /// </summary>
    [JsonPropertyName("Date")]
    public string? Date { get; set; }

    /// <summary>
    /// Arrival time in HHMMSS format.
    /// </summary>
    [JsonPropertyName("Time")]
    public string? Time { get; set; }
}
