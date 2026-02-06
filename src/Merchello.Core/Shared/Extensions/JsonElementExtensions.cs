using System.Text.Json;

namespace Merchello.Core.Shared.Extensions;

/// <summary>
/// Extension methods for safely unwrapping System.Text.Json.JsonElement values
/// that arise from deserializing Dictionary&lt;string, object&gt; properties.
/// </summary>
public static class JsonElementExtensions
{
    /// <summary>
    /// If the value is a <see cref="JsonElement"/>, extracts the underlying CLR value.
    /// Otherwise returns the value unchanged.
    /// </summary>
    public static object? UnwrapJsonElement(this object? value)
    {
        if (value is not JsonElement element) return value;
        return element.ValueKind switch
        {
            JsonValueKind.Number => element.GetDecimal(),
            JsonValueKind.String => element.GetString(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null or JsonValueKind.Undefined => null,
            _ => element.GetRawText()
        };
    }
}
