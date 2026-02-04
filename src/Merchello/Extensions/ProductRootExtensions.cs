using System.Text.Json;
using Merchello.Core.Products.Models;
using Merchello.Factories;
using Umbraco.Cms.Core.Models.PublishedContent;

namespace Merchello.Extensions;

/// <summary>
/// Extension methods for accessing Umbraco Element Type properties on ProductRoot.
/// Supports direct JSON access and optional conversion through MerchelloPublishedElementFactory.
/// </summary>
public static class ProductRootExtensions
{
    // JSON options matching ProductService for consistent deserialization
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <summary>
    /// Gets the value of a property from the configured Element Type.
    /// Uses Umbraco's property value converters for type conversion.
    /// </summary>
    /// <typeparam name="T">The target property type.</typeparam>
    /// <param name="productRoot">The product root.</param>
    /// <param name="alias">The property alias.</param>
    /// <param name="culture">The variation language.</param>
    /// <param name="segment">The variation segment.</param>
    /// <param name="fallback">Optional fallback strategy.</param>
    /// <param name="defaultValue">The default value if property not found or has no value.</param>
    /// <returns>The typed property value, or defaultValue if not found.</returns>
    public static T? Value<T>(
        this ProductRoot productRoot,
        string alias,
        string? culture = null,
        string? segment = null,
        Fallback fallback = default,
        T? defaultValue = default)
    {
        if (!TryGetPropertyValue(productRoot, alias, out var rawValue))
        {
            return defaultValue;
        }

        if (TryConvertValue(rawValue, out T? convertedValue))
        {
            return convertedValue;
        }

        return defaultValue;
    }

    /// <summary>
    /// Gets the value of a property as object.
    /// </summary>
    /// <param name="productRoot">The product root.</param>
    /// <param name="alias">The property alias.</param>
    /// <param name="culture">The variation language.</param>
    /// <param name="segment">The variation segment.</param>
    /// <param name="fallback">Optional fallback strategy.</param>
    /// <param name="defaultValue">The default value if property not found or has no value.</param>
    /// <returns>The property value as object, or defaultValue if not found.</returns>
    public static object? Value(
        this ProductRoot productRoot,
        string alias,
        string? culture = null,
        string? segment = null,
        Fallback fallback = default,
        object? defaultValue = default)
    {
        if (!TryGetPropertyValue(productRoot, alias, out var rawValue))
        {
            return defaultValue;
        }

        return NormalizeRawValue(rawValue) ?? defaultValue;
    }

    /// <summary>
    /// Checks if the product has a value for the specified property.
    /// </summary>
    /// <param name="productRoot">The product root.</param>
    /// <param name="alias">The property alias.</param>
    /// <param name="culture">The variation language.</param>
    /// <param name="segment">The variation segment.</param>
    /// <returns>True if the property exists and has a value.</returns>
    public static bool HasValue(
        this ProductRoot productRoot,
        string alias,
        string? culture = null,
        string? segment = null)
    {
        if (!TryGetPropertyValue(productRoot, alias, out var rawValue))
        {
            return false;
        }

        return HasValue(rawValue);
    }

    /// <summary>
    /// Gets the underlying IPublishedElement for this ProductRoot.
    /// </summary>
    /// <param name="productRoot">The product root.</param>
    /// <returns>
    /// Always null. Use the overload that accepts <see cref="MerchelloPublishedElementFactory"/>
    /// and <paramref name="elementTypeAlias"/> to resolve a published element.
    /// </returns>
    [Obsolete("Use GetPublishedElement(ProductRoot, string?, MerchelloPublishedElementFactory) and pass explicit dependencies.")]
    public static IPublishedElement? GetPublishedElement(this ProductRoot productRoot) => null;

    /// <summary>
    /// Gets the underlying IPublishedElement for this ProductRoot using explicit dependencies.
    /// </summary>
    /// <param name="productRoot">The product root.</param>
    /// <param name="elementTypeAlias">The configured element type alias.</param>
    /// <param name="elementFactory">The published element factory.</param>
    /// <returns>IPublishedElement with converted properties, or null.</returns>
    public static IPublishedElement? GetPublishedElement(
        this ProductRoot productRoot,
        string? elementTypeAlias,
        MerchelloPublishedElementFactory elementFactory)
    {
        if (string.IsNullOrWhiteSpace(productRoot.ElementPropertyData))
            return null;

        if (string.IsNullOrWhiteSpace(elementTypeAlias))
            return null;

        var propertyValues = DeserializeElementProperties(productRoot.ElementPropertyData);
        if (propertyValues.Count == 0)
            return null;

        return elementFactory.CreateElement(
            elementTypeAlias,
            productRoot.Id,
            propertyValues);
    }

    private static bool TryGetPropertyValue(ProductRoot productRoot, string alias, out object? value)
    {
        value = null;
        if (string.IsNullOrWhiteSpace(alias) || string.IsNullOrWhiteSpace(productRoot.ElementPropertyData))
        {
            return false;
        }

        var properties = DeserializeElementProperties(productRoot.ElementPropertyData);
        return properties.TryGetValue(alias, out value);
    }

    private static bool TryConvertValue<T>(object? rawValue, out T? value)
    {
        value = default;
        if (rawValue is null)
        {
            return false;
        }

        if (rawValue is T typedValue)
        {
            value = typedValue;
            return true;
        }

        if (rawValue is JsonElement jsonElement)
        {
            if (jsonElement.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            {
                return false;
            }

            try
            {
                value = jsonElement.Deserialize<T>(JsonOptions);
                return value is not null;
            }
            catch
            {
                return false;
            }
        }

        try
        {
            if (typeof(T) == typeof(string))
            {
                value = (T?)(object?)rawValue.ToString();
                return value is not null;
            }

            var targetType = Nullable.GetUnderlyingType(typeof(T)) ?? typeof(T);
            var converted = Convert.ChangeType(rawValue, targetType);
            if (converted is T convertedValue)
            {
                value = convertedValue;
                return true;
            }
        }
        catch
        {
        }

        try
        {
            var serialized = JsonSerializer.Serialize(rawValue, JsonOptions);
            value = JsonSerializer.Deserialize<T>(serialized, JsonOptions);
            return value is not null;
        }
        catch
        {
            return false;
        }
    }

    private static object? NormalizeRawValue(object? rawValue)
    {
        if (rawValue is not JsonElement jsonElement)
        {
            return rawValue;
        }

        return jsonElement.ValueKind switch
        {
            JsonValueKind.Null or JsonValueKind.Undefined => null,
            JsonValueKind.String => jsonElement.GetString(),
            JsonValueKind.Number => jsonElement.TryGetInt64(out var numberLong)
                ? numberLong
                : jsonElement.TryGetDecimal(out var numberDecimal)
                    ? numberDecimal
                    : jsonElement.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            _ => JsonSerializer.Deserialize<object?>(jsonElement.GetRawText(), JsonOptions)
        };
    }

    private static bool HasValue(object? rawValue)
    {
        if (rawValue is null)
        {
            return false;
        }

        if (rawValue is string stringValue)
        {
            return !string.IsNullOrWhiteSpace(stringValue);
        }

        if (rawValue is JsonElement jsonElement)
        {
            return jsonElement.ValueKind switch
            {
                JsonValueKind.Null or JsonValueKind.Undefined => false,
                JsonValueKind.String => !string.IsNullOrWhiteSpace(jsonElement.GetString()),
                JsonValueKind.Array => jsonElement.GetArrayLength() > 0,
                _ => true
            };
        }

        return true;
    }

    /// <summary>
    /// Deserializes element property values from JSON storage.
    /// Uses same format as ProductService for consistency.
    /// </summary>
    private static Dictionary<string, object?> DeserializeElementProperties(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, object?>>(json, JsonOptions) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
