using System.Text.Json.Serialization;

namespace Merchello.Core.Upsells.Models;

/// <summary>
/// The type of analytics event recorded for upsells.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UpsellEventType
{
    Impression,
    Click,
    Conversion
}
