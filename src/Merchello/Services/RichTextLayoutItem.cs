using System.Text.Json.Serialization;

namespace Merchello.Services;

/// <summary>
/// Layout item linking content to settings.
/// </summary>
internal sealed class RichTextLayoutItem
{
    [JsonPropertyName("contentKey")]
    public string ContentKey { get; set; } = string.Empty;

    [JsonPropertyName("settingsKey")]
    public string? SettingsKey { get; set; }
}
