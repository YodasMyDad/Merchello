using System.Text.Json.Serialization;

namespace Merchello.Services;

/// <summary>
/// Block content/settings data.
/// </summary>
internal sealed class BlockContentData
{
    [JsonPropertyName("key")]
    public Guid Key { get; set; }

    [JsonPropertyName("contentTypeKey")]
    public Guid ContentTypeKey { get; set; }

    [JsonPropertyName("values")]
    public List<BlockValueItem>? Values { get; set; }
}
