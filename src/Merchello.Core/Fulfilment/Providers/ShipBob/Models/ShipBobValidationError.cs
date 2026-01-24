using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Individual validation error from ShipBob API.
/// </summary>
public sealed record ShipBobValidationError
{
    [JsonPropertyName("field")]
    public string? Field { get; init; }

    [JsonPropertyName("message")]
    public string? Message { get; init; }
}
