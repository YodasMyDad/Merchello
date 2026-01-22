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

/// <summary>
/// Parsed API error with status code.
/// </summary>
public sealed record ShipBobApiError
{
    public int StatusCode { get; init; }
    public string? Message { get; init; }
    public string? Type { get; init; }
    public IReadOnlyList<ShipBobValidationError> ValidationErrors { get; init; } = [];
    public bool IsRateLimited => StatusCode == 429;
    public TimeSpan? RetryAfter { get; init; }

    public string GetDisplayMessage()
    {
        if (ValidationErrors.Count > 0)
        {
            var errors = string.Join("; ", ValidationErrors.Select(e =>
                string.IsNullOrWhiteSpace(e.Field) ? e.Message : $"{e.Field}: {e.Message}"));
            return $"{Message}: {errors}";
        }

        return Message ?? $"HTTP {StatusCode} error";
    }
}
