using System.Text.Json;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Models;
using Merchello.Factories;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Extensions;

namespace Merchello.Extensions;

/// <summary>
/// Extension methods for accessing Umbraco Element Type properties on ProductRoot.
/// Enables Value&lt;T&gt;("alias") syntax when querying products via EF Core.
/// Uses Umbraco's property value converters for type conversion.
/// </summary>
public static class ProductRootExtensions
{
    // Cache singleton services for performance using thread-safe lazy initialization
    private static readonly Lazy<IPublishedValueFallback> _publishedValueFallback =
        new(() => StaticServiceProvider.Instance.GetRequiredService<IPublishedValueFallback>());

    private static readonly Lazy<MerchelloSettings> _merchelloSettings =
        new(() => StaticServiceProvider.Instance.GetRequiredService<IOptions<MerchelloSettings>>().Value);

    private static IPublishedValueFallback PublishedValueFallback => _publishedValueFallback.Value;
    private static MerchelloSettings MerchelloSettings => _merchelloSettings.Value;

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
        var element = productRoot.GetPublishedElement();
        if (element is null) return defaultValue;

        return element.Value(PublishedValueFallback, alias, culture, segment, fallback, defaultValue);
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
        var element = productRoot.GetPublishedElement();
        if (element is null) return defaultValue;

        return element.Value(PublishedValueFallback, alias, culture, segment, fallback, defaultValue);
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
        var element = productRoot.GetPublishedElement();
        return element?.HasValue(alias, culture, segment) ?? false;
    }

    /// <summary>
    /// Gets the underlying IPublishedElement for this ProductRoot.
    /// Returns null if no Element Type is configured or no property data exists.
    /// </summary>
    /// <param name="productRoot">The product root.</param>
    /// <returns>IPublishedElement with converted properties, or null.</returns>
    public static IPublishedElement? GetPublishedElement(this ProductRoot productRoot)
    {
        if (string.IsNullOrEmpty(productRoot.ElementPropertyData))
            return null;

        var elementTypeAlias = MerchelloSettings.ProductElementTypeAlias;
        if (string.IsNullOrEmpty(elementTypeAlias))
            return null;

        // Deserialize property values inline (avoid resolving scoped IProductService)
        var propertyValues = DeserializeElementProperties(productRoot.ElementPropertyData);
        if (propertyValues.Count == 0)
            return null;

        // Resolve factory per-call (scoped service, but stateless operation)
        var elementFactory = StaticServiceProvider.Instance
            .GetRequiredService<MerchelloPublishedElementFactory>();

        return elementFactory.CreateElement(
            elementTypeAlias,
            productRoot.Id,
            propertyValues);
    }

    /// <summary>
    /// Deserializes element property values from JSON storage.
    /// Uses same format as ProductService for consistency.
    /// </summary>
    private static Dictionary<string, object?> DeserializeElementProperties(string json)
        => JsonSerializer.Deserialize<Dictionary<string, object?>>(json, JsonOptions) ?? [];
}
