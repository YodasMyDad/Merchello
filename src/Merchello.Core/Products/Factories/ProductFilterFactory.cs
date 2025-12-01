using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Factories;

public class ProductFilterFactory
{
    public ProductFilter Create(string name, int sortOrder = 0, string hexColour = "")
    {
        return new ProductFilter
        {
            Name = name,
            SortOrder = sortOrder,
            HexColour = hexColour
        };
    }
}
