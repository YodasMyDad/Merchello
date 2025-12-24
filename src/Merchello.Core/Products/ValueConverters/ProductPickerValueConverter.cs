using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;

namespace Merchello.Core.Products.ValueConverters;

/// <summary>
/// Property value converter for the Merchello Product Picker property editor.
/// Converts stored comma-separated variant GUIDs to Product objects.
/// </summary>
/// <remarks>
/// Always returns IEnumerable&lt;Product&gt; for consistency.
/// For single-select usage (maxItems=1), use .FirstOrDefault() in templates.
/// Value converters are singletons, so we use IServiceScopeFactory to resolve scoped services.
/// </remarks>
public class ProductPickerValueConverter(IServiceScopeFactory serviceScopeFactory) : PropertyValueConverterBase
{
    private const string EditorUiAlias = "Merchello.PropertyEditorUi.ProductPicker";

    public override bool IsConverter(IPublishedPropertyType propertyType)
        => EditorUiAlias.Equals(propertyType.EditorUiAlias, StringComparison.OrdinalIgnoreCase);

    public override Type GetPropertyValueType(IPublishedPropertyType propertyType)
        => typeof(IEnumerable<Product>);

    public override PropertyCacheLevel GetPropertyCacheLevel(IPublishedPropertyType propertyType)
        => PropertyCacheLevel.Element;

    public override bool? IsValue(object? value, PropertyValueLevel level)
        => value is not null && !string.IsNullOrWhiteSpace(value.ToString());

    public override object? ConvertSourceToIntermediate(
        IPublishedElement owner,
        IPublishedPropertyType propertyType,
        object? source,
        bool preview)
        => source?.ToString();

    public override object? ConvertIntermediateToObject(
        IPublishedElement owner,
        IPublishedPropertyType propertyType,
        PropertyCacheLevel referenceCacheLevel,
        object? inter,
        bool preview)
    {
        if (string.IsNullOrWhiteSpace(inter?.ToString()))
        {
            return Enumerable.Empty<Product>();
        }

        var ids = ParseVariantIds(inter.ToString()!);
        if (ids.Count == 0)
        {
            return Enumerable.Empty<Product>();
        }

        // Value converters are singletons, so create a scope to resolve scoped IProductService
        using var scope = serviceScopeFactory.CreateScope();
        var productService = scope.ServiceProvider.GetRequiredService<IProductService>();

        // Fetch variants using batch method to avoid N+1 queries
        // Use Task.Run to avoid sync-over-async deadlocks in ASP.NET contexts
        var variants = Task.Run(() => productService.GetVariantsByIds(ids)).GetAwaiter().GetResult();

        // Preserve the original order from the stored value
        var orderedVariants = new List<Product>(ids.Count);
        foreach (var id in ids)
        {
            var variant = variants.Find(v => v.Id == id);
            if (variant != null)
            {
                orderedVariants.Add(variant);
            }
        }

        return orderedVariants;
    }

    private static List<Guid> ParseVariantIds(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return [];
        }

        var parts = value.Split(',', StringSplitOptions.RemoveEmptyEntries);
        var ids = new List<Guid>(parts.Length);

        foreach (var part in parts)
        {
            if (Guid.TryParse(part.Trim(), out var guid))
            {
                ids.Add(guid);
            }
        }

        return ids;
    }
}
