using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Factories;

public class ProductFilterGroupFactory
{
    public ProductFilterGroup Create(string name, int sortOrder = 0)
    {
        return new ProductFilterGroup
        {
            Name = name,
            SortOrder = sortOrder
        };
    }
}
