using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// ShipBob API error response.
/// </summary>
public sealed record ShipBobErrorResponse
{
    [JsonPropertyName("message")]
    public string? Message { get; init; }

    [JsonPropertyName("type")]
    public string? Type { get; init; }

    [JsonPropertyName("errors")]
    public IReadOnlyList<ShipBobValidationError>? Errors { get; init; }
}
