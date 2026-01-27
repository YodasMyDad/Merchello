using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Products.Factories;

public class ProductFilterFactory
{
    public ProductFilter Create(
        string name,
        Guid filterGroupId,
        int sortOrder = 0,
        string? hexColour = null,
        Guid? image = null)
    {
        return new ProductFilter
        {
            Id = GuidExtensions.NewSequentialGuid,
            Name = name,
            ProductFilterGroupId = filterGroupId,
            SortOrder = sortOrder,
            HexColour = hexColour,
            Image = image
        };
    }
}
