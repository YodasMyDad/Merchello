using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PublishedCache;

namespace Merchello.Factories;

/// <summary>
/// Factory for creating IPublishedElement instances from stored JSON property data.
/// Used to provide proper Umbraco property value conversion for product element properties.
/// </summary>
public class MerchelloPublishedElementFactory(
    IPublishedContentTypeCache contentTypeCache,
    IVariationContextAccessor variationContextAccessor,
    ILogger<MerchelloPublishedElementFactory> logger)
{
    /// <summary>
    /// Creates an IPublishedElement from stored property values.
    /// </summary>
    /// <param name="elementTypeAlias">Alias of the Element Type</param>
    /// <param name="elementKey">Unique key for this element instance (use ProductRoot.Id)</param>
    /// <param name="propertyValues">Property values as { alias: rawValue } dictionary</param>
    /// <returns>IPublishedElement with properly converted property values, or null if type not found</returns>
    public IPublishedElement? CreateElement(
        string elementTypeAlias,
        Guid elementKey,
        Dictionary<string, object?> propertyValues)
    {
        var publishedContentType = contentTypeCache.Get(
            PublishedItemType.Element,
            elementTypeAlias);

        if (publishedContentType is null)
        {
            logger.LogWarning(
                "Element Type '{ElementTypeAlias}' not found in published content type cache",
                elementTypeAlias);
            return null;
        }

        var variationContext = variationContextAccessor.VariationContext
            ?? new VariationContext();

        try
        {
            // Umbraco's PublishedElement handles:
            // 1. Creating IPublishedProperty for each property type
            // 2. Property value converters process raw values → typed objects
            // 3. GetValue<T>() returns properly typed, converted values
            return new PublishedElement(
                publishedContentType,
                elementKey,
                propertyValues,
                previewing: false,
                variationContext);
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Failed to create PublishedElement for type '{ElementTypeAlias}' with key {ElementKey}",
                elementTypeAlias,
                elementKey);
            return null;
        }
    }
}
