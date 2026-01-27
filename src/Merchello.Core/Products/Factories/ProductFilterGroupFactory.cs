using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Products.Factories;

public class ProductFilterGroupFactory
{
    public ProductFilterGroup Create(string name, int sortOrder = 0)
    {
        return new ProductFilterGroup
        {
            Id = GuidExtensions.NewSequentialGuid,
            Name = name,
            SortOrder = sortOrder
        };
    }
}
