using System.Text.Json.Serialization;
using Merchello.Core.Shared.Providers;

namespace Merchello.Core.Shared.Dtos;

/// <summary>
/// Select option for dropdown fields
/// </summary>
public class SelectOptionDto
{
    [JsonPropertyName("value")]
    public required string Value { get; set; }

    [JsonPropertyName("label")]
    public required string Label { get; set; }
}
