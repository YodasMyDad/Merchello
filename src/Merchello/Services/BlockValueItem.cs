using System.Text.Json.Serialization;

namespace Merchello.Services;

/// <summary>
/// Individual property value in a block.
/// </summary>
internal sealed class BlockValueItem
{
    [JsonPropertyName("alias")]
    public string Alias { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public object? Value { get; set; }
}
