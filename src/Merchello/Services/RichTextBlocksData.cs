using System.Text.Json.Serialization;

namespace Merchello.Services;

/// <summary>
/// Represents the blocks data from RichTextEditorValue.
/// </summary>
internal sealed class RichTextBlocksData
{
    [JsonPropertyName("layout")]
    public Dictionary<string, List<RichTextLayoutItem>>? Layout { get; set; }

    [JsonPropertyName("contentData")]
    public List<BlockContentData>? ContentData { get; set; }

    [JsonPropertyName("settingsData")]
    public List<BlockContentData>? SettingsData { get; set; }
}
