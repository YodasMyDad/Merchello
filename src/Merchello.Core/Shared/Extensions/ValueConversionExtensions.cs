using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Merchello.Core.Shared.Extensions;

public static class ValueConversionExtensions
{
    private static readonly JsonSerializerOptions s_jsonOptions = new() { WriteIndented = false };

    /// <summary>
    /// Configures a property to store as JSON with a non-nullable type.
    /// </summary>
    public static void ToJsonConversion<T>(this PropertyBuilder<T> propertyBuilder, int? columnSize)
        where T : class, new()
    {
        var converter = new ValueConverter<T, string>
        (
            v => JsonSerializer.Serialize(v, s_jsonOptions),
            v => JsonSerializer.Deserialize<T>(v, s_jsonOptions) ?? new T()
        );

        var comparer = new ValueComparer<T>
        (
            (l, r) => JsonSerializer.Serialize(l, s_jsonOptions) == JsonSerializer.Serialize(r, s_jsonOptions),
            v => v == null ? 0 : JsonSerializer.Serialize(v, s_jsonOptions).GetHashCode(),
            v => JsonSerializer.Deserialize<T>(JsonSerializer.Serialize(v, s_jsonOptions), s_jsonOptions)!
        );

        propertyBuilder.HasConversion(converter);
        propertyBuilder.Metadata.SetValueConverter(converter);
        propertyBuilder.Metadata.SetValueComparer(comparer);

        if (columnSize != null)
        {
            propertyBuilder.HasMaxLength(columnSize.Value);
        }
    }

    /// <summary>
    /// Configures a nullable property to store as JSON. Null values are stored as NULL in the database.
    /// </summary>
    public static void ToNullableJsonConversion<T>(this PropertyBuilder<T?> propertyBuilder, int? columnSize)
        where T : class, new()
    {
        var converter = new ValueConverter<T?, string?>(
            v => v == null ? null : JsonSerializer.Serialize(v, s_jsonOptions),
            v => string.IsNullOrEmpty(v) ? null : JsonSerializer.Deserialize<T>(v, s_jsonOptions)
        );

        var comparer = new ValueComparer<T?>(
            (l, r) => (l == null && r == null) ||
                      (l != null && r != null && JsonSerializer.Serialize(l, s_jsonOptions) == JsonSerializer.Serialize(r, s_jsonOptions)),
            v => v == null ? 0 : JsonSerializer.Serialize(v, s_jsonOptions).GetHashCode(),
            v => v == null ? null : JsonSerializer.Deserialize<T>(JsonSerializer.Serialize(v, s_jsonOptions), s_jsonOptions)
        );

        propertyBuilder.HasConversion(converter);
        propertyBuilder.Metadata.SetValueConverter(converter);
        propertyBuilder.Metadata.SetValueComparer(comparer);

        if (columnSize != null)
        {
            propertyBuilder.HasMaxLength(columnSize.Value);
        }
    }
}
