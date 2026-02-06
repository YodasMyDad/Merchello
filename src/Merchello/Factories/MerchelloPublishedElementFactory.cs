using System.Text.Json;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Models.Editors;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.PublishedCache;
using Umbraco.Cms.Core.Services;

namespace Merchello.Factories;

/// <summary>
/// Factory for creating IPublishedElement instances from stored JSON property data.
/// Used to provide proper Umbraco property value conversion for product element properties.
/// </summary>
public class MerchelloPublishedElementFactory(
    IPublishedContentTypeCache contentTypeCache,
    IContentTypeService contentTypeService,
    PropertyEditorCollection propertyEditors,
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
        // Workaround for Umbraco bug: PublishedContentTypeCache.Get(itemType, alias) does not
        // handle PublishedItemType.Element, but Get(itemType, key) does.
        // Look up the element type by alias to get its Key, then use key-based lookup.
        var contentType = contentTypeService.Get(elementTypeAlias);
        if (contentType is null || !contentType.IsElement)
        {
            logger.LogWarning(
                "Element Type '{ElementTypeAlias}' not found or is not an element type",
                elementTypeAlias);
            return null;
        }

        var publishedContentType = contentTypeCache.Get(
            PublishedItemType.Element,
            contentType.Key);

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
            // Stored values are captured in editor format. Convert to source format first
            // so PublishedElement value converters see the same data shape as Umbraco content.
            var sourceValues = NormalizeSourceValues(
                publishedContentType,
                propertyValues,
                elementKey);

            return new PublishedElement(
                publishedContentType,
                elementKey,
                sourceValues,
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

    private Dictionary<string, object?> NormalizeSourceValues(
        IPublishedContentType publishedContentType,
        Dictionary<string, object?> propertyValues,
        Guid elementKey)
    {
        if (propertyValues.Count == 0)
        {
            return propertyValues;
        }

        var normalizedValues = propertyValues.ToDictionary(
            kvp => kvp.Key,
            kvp => NormalizeEditorValue(kvp.Value),
            StringComparer.OrdinalIgnoreCase);

        foreach (var propertyType in publishedContentType.PropertyTypes)
        {
            if (!normalizedValues.TryGetValue(propertyType.Alias, out var editorValue))
            {
                continue;
            }

            if (!propertyEditors.TryGet(propertyType.EditorAlias, out var propertyEditor))
            {
                continue;
            }

            // These editors persist as strings; if a persisted value has already been stored,
            // keep it as-is to avoid nulling the value with a second FromEditor conversion.
            if (editorValue is string stringEditorValue)
            {
                if (propertyType.EditorAlias.Equals(
                        Umbraco.Cms.Core.Constants.PropertyEditors.Aliases.MultipleTextstring,
                        StringComparison.Ordinal))
                {
                    continue;
                }

                if ((propertyType.EditorAlias.Equals(
                        Umbraco.Cms.Core.Constants.PropertyEditors.Aliases.CheckBoxList,
                        StringComparison.Ordinal)
                    || propertyType.EditorAlias.Equals(
                        Umbraco.Cms.Core.Constants.PropertyEditors.Aliases.DropDownListFlexible,
                        StringComparison.Ordinal))
                    && IsJsonArrayString(stringEditorValue))
                {
                    continue;
                }
            }

            try
            {
                var sourceValue = propertyEditor.GetValueEditor().FromEditor(
                    new ContentPropertyData(editorValue, propertyType.DataType.ConfigurationObject)
                    {
                        ContentKey = elementKey
                    },
                    currentValue: null);

                normalizedValues[propertyType.Alias] = sourceValue;
            }
            catch (Exception ex)
            {
                logger.LogDebug(
                    ex,
                    "Failed converting editor value for element property '{PropertyAlias}' ({EditorAlias}). Using raw value.",
                    propertyType.Alias,
                    propertyType.EditorAlias);
            }
        }

        return normalizedValues;
    }

    private static object? NormalizeEditorValue(object? value) =>
        value is JsonElement jsonElement
            ? ConvertJsonElement(jsonElement)
            : value;

    private static object? ConvertJsonElement(JsonElement jsonElement)
    {
        switch (jsonElement.ValueKind)
        {
            case JsonValueKind.Null:
            case JsonValueKind.Undefined:
                return null;

            case JsonValueKind.String:
                return jsonElement.GetString();

            case JsonValueKind.Number:
                if (jsonElement.TryGetInt32(out var intValue))
                {
                    return intValue;
                }

                if (jsonElement.TryGetInt64(out var longValue))
                {
                    return longValue;
                }

                if (jsonElement.TryGetDecimal(out var decimalValue))
                {
                    return decimalValue;
                }

                return jsonElement.GetDouble();

            case JsonValueKind.True:
                return true;

            case JsonValueKind.False:
                return false;

            case JsonValueKind.Array:
                var arrayItems = jsonElement.EnumerateArray().ToArray();
                if (arrayItems.All(item => item.ValueKind == JsonValueKind.String))
                {
                    return arrayItems.Select(item => item.GetString() ?? string.Empty).ToArray();
                }

                return arrayItems.Select(ConvertJsonElement).ToArray();

            case JsonValueKind.Object:
                var objectValues = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                foreach (var property in jsonElement.EnumerateObject())
                {
                    objectValues[property.Name] = ConvertJsonElement(property.Value);
                }

                return objectValues;

            default:
                return jsonElement.GetRawText();
        }
    }

    private static bool IsJsonArrayString(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        try
        {
            using var jsonDocument = JsonDocument.Parse(value);
            return jsonDocument.RootElement.ValueKind == JsonValueKind.Array;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
