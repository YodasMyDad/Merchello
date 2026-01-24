using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;

namespace Merchello.Core.Products.ValueConverters;

/// <summary>
/// Property value converter for the Merchello Filter Group Picker property editor.
/// Converts stored comma-separated GUIDs to ProductFilterGroup objects.
/// </summary>
/// <remarks>
/// Always returns IEnumerable&lt;ProductFilterGroup&gt; for consistency.
/// For single-select usage (maxItems=1), use .FirstOrDefault() in templates.
/// Value converters are singletons, so we use IServiceScopeFactory to resolve scoped services.
/// Uses sync-over-async (Task.Run + GetAwaiter().GetResult()) because Umbraco's IPropertyValueConverter
/// interface is synchronous. This is a known Umbraco platform limitation that cannot be resolved
/// without upstream API changes.
/// </remarks>
public class FilterGroupPickerValueConverter(IServiceScopeFactory serviceScopeFactory) : PropertyValueConverterBase
{
    private const string EditorUiAlias = "Merchello.PropertyEditorUi.FilterGroupPicker";

    public override bool IsConverter(IPublishedPropertyType propertyType)
        => EditorUiAlias.Equals(propertyType.EditorUiAlias, StringComparison.OrdinalIgnoreCase);

    public override Type GetPropertyValueType(IPublishedPropertyType propertyType)
        => typeof(IEnumerable<ProductFilterGroup>);

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
            return Enumerable.Empty<ProductFilterGroup>();
        }

        var ids = ParseIds(inter.ToString()!);
        if (ids.Count == 0)
        {
            return Enumerable.Empty<ProductFilterGroup>();
        }

        // Value converters are singletons, so create a scope to resolve scoped IProductFilterService
        using var scope = serviceScopeFactory.CreateScope();
        var productFilterService = scope.ServiceProvider.GetRequiredService<IProductFilterService>();

        // Fetch filter groups using batch method to avoid N+1 queries
        // Use Task.Run to avoid sync-over-async deadlocks in ASP.NET contexts
        var filterGroups = Task.Run(() => productFilterService.GetFilterGroupsByIds(ids)).GetAwaiter().GetResult();

        // Preserve the original order from the stored value
        List<ProductFilterGroup> orderedGroups = new(ids.Count);
        foreach (var id in ids)
        {
            var group = filterGroups.Find(g => g.Id == id);
            if (group != null)
            {
                orderedGroups.Add(group);
            }
        }

        return orderedGroups;
    }

    private static List<Guid> ParseIds(string value)
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
