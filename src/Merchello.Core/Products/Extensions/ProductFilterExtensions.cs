using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Extensions;

public static class ProductFilterExtensions
{
    /// <summary>
    /// Creates a new ProductFilterGroup with filters
    /// </summary>
    public static (ProductFilterGroup group, List<ProductFilter> filters) CreateFilterGroup(
        this ProductFilterGroupFactory groupFactory,
        ProductFilterFactory filterFactory,
        string groupName,
        string[] filterNames,
        int sortOrder = 0,
        string defaultHexColour = "")
    {
        var filterGroup = groupFactory.Create(groupName, sortOrder);

        var filters = filterNames.Select((name, index) =>
        {
            var filter = filterFactory.Create(
                name,
                filterGroup.Id,
                index,
                string.IsNullOrEmpty(defaultHexColour) ? null : defaultHexColour);
            filter.ParentGroup = filterGroup;
            return filter;
        }).ToList();

        filterGroup.Filters = filters;

        return (filterGroup, filters);
    }

    /// <summary>
    /// Creates a Color filter group with common color names
    /// </summary>
    public static (ProductFilterGroup group, List<ProductFilter> filters) CreateColorFilterGroup(
        this ProductFilterGroupFactory groupFactory,
        ProductFilterFactory filterFactory,
        string[]? colors = null,
        int sortOrder = 1)
    {
        colors ??= ["Black", "White", "Navy", "Grey", "Red", "Blue", "Green"];
        return groupFactory.CreateFilterGroup(filterFactory, "Color", colors, sortOrder);
    }

    /// <summary>
    /// Creates a Size filter group with common sizes
    /// </summary>
    public static (ProductFilterGroup group, List<ProductFilter> filters) CreateSizeFilterGroup(
        this ProductFilterGroupFactory groupFactory,
        ProductFilterFactory filterFactory,
        string[]? sizes = null,
        int sortOrder = 2)
    {
        sizes ??= ["XS", "S", "M", "L", "XL", "XXL"];
        return groupFactory.CreateFilterGroup(filterFactory, "Size", sizes, sortOrder);
    }

    /// <summary>
    /// Creates a Material filter group
    /// </summary>
    public static (ProductFilterGroup group, List<ProductFilter> filters) CreateMaterialFilterGroup(
        this ProductFilterGroupFactory groupFactory,
        ProductFilterFactory filterFactory,
        string[] materials,
        int sortOrder = 3)
    {
        return groupFactory.CreateFilterGroup(filterFactory, "Material", materials, sortOrder);
    }

    /// <summary>
    /// Creates a Brand filter group
    /// </summary>
    public static (ProductFilterGroup group, List<ProductFilter> filters) CreateBrandFilterGroup(
        this ProductFilterGroupFactory groupFactory,
        ProductFilterFactory filterFactory,
        string[] brands,
        int sortOrder = 4)
    {
        return groupFactory.CreateFilterGroup(filterFactory, "Brand", brands, sortOrder);
    }
}
