using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;

namespace Merchello.Core.Products.ValueConverters;

/// <summary>
/// Property value converter for the Merchello Collection Picker property editor.
/// Converts stored comma-separated GUIDs to ProductCollection objects.
/// </summary>
/// <remarks>
/// Always returns IEnumerable&lt;ProductCollection&gt; for consistency.
/// For single-select usage (maxItems=1), use .FirstOrDefault() in templates.
/// Value converters are singletons, so we use IServiceScopeFactory to resolve scoped services.
/// Uses sync-over-async (Task.Run + GetAwaiter().GetResult()) because Umbraco's IPropertyValueConverter
/// interface is synchronous. This is a known Umbraco platform limitation that cannot be resolved
/// without upstream API changes.
/// </remarks>
public class CollectionPickerValueConverter(IServiceScopeFactory serviceScopeFactory) : PropertyValueConverterBase
{
    private const string EditorUiAlias = "Merchello.PropertyEditorUi.CollectionPicker";

    public override bool IsConverter(IPublishedPropertyType propertyType)
        => EditorUiAlias.Equals(propertyType.EditorUiAlias, StringComparison.OrdinalIgnoreCase);

    public override Type GetPropertyValueType(IPublishedPropertyType propertyType)
        => typeof(IEnumerable<ProductCollection>);

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
            return Enumerable.Empty<ProductCollection>();
        }

        var ids = ParseCollectionIds(inter.ToString()!);
        if (ids.Count == 0)
        {
            return Enumerable.Empty<ProductCollection>();
        }

        // Value converters are singletons, so create a scope to resolve scoped IProductCollectionService
        using var scope = serviceScopeFactory.CreateScope();
        var productCollectionService = scope.ServiceProvider.GetRequiredService<IProductCollectionService>();

        // Fetch collections using batch method to avoid N+1 queries
        // Use Task.Run to avoid sync-over-async deadlocks in ASP.NET contexts
        List<ProductCollection> collections;
        using (System.Threading.ExecutionContext.SuppressFlow())
        {
            collections = Task.Run(() => productCollectionService.GetCollectionsByIds(ids)).GetAwaiter().GetResult();
        }

        // Preserve the original order from the stored value
        List<ProductCollection> orderedCollections = new(ids.Count);
        foreach (var id in ids)
        {
            var collection = collections.Find(c => c.Id == id);
            if (collection != null)
            {
                orderedCollections.Add(collection);
            }
        }

        return orderedCollections;
    }

    private static List<Guid> ParseCollectionIds(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return [];
        }

        var parts = value.Split(',', StringSplitOptions.RemoveEmptyEntries);
        List<Guid> ids = new(parts.Length);

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
