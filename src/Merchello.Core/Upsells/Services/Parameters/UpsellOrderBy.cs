using System.Text.Json.Serialization;

namespace Merchello.Core.Upsells.Services.Parameters;

/// <summary>
/// Sort order options for querying upsell rules.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UpsellOrderBy
{
    Name,
    DateCreated,
    Priority,
    Status
}
