using System.Text.Json;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Models;
using Merchello.Factories;
using Microsoft.Extensions.Options;
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
    // Services are initialized during application startup via Initialize()
    private static IPublishedValueFallback? _publishedValueFallback;
    private static MerchelloSettings? _merchelloSettings;
    private static MerchelloPublishedElementFactory? _elementFactory;

    private static IPublishedValueFallback PublishedValueFallback =>
        _publishedValueFallback ?? throw new InvalidOperationException(
            "ProductRootExtensions not initialized. Call ProductRootExtensions.Initialize() during application startup.");

    private static MerchelloSettings MerchelloSettings =>
        _merchelloSettings ?? throw new InvalidOperationException(
            "ProductRootExtensions not initialized. Call ProductRootExtensions.Initialize() during application startup.");

    private static MerchelloPublishedElementFactory ElementFactory =>
        _elementFactory ?? throw new InvalidOperationException(
            "ProductRootExtensions not initialized. Call ProductRootExtensions.Initialize() during application startup.");

    /// <summary>
    /// Initializes the static extension methods with required services.
    /// Call this during application startup (e.g., in a hosted service or notification handler).
    /// </summary>
    public static void Initialize(
        IPublishedValueFallback publishedValueFallback,
        IOptions<MerchelloSettings> merchelloSettings,
        MerchelloPublishedElementFactory elementFactory)
    {
        _publishedValueFallback = publishedValueFallback;
        _merchelloSettings = merchelloSettings.Value;
        _elementFactory = elementFactory;
    }

    /// <summary>
    /// Returns true if the extension methods have been initialized.
    /// </summary>
    public static bool IsInitialized =>
        _publishedValueFallback != null && _merchelloSettings != null && _elementFactory != null;

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

        return ElementFactory.CreateElement(
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
