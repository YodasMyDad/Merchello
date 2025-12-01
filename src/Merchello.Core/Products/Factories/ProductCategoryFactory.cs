using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Factories;

public class ProductCategoryFactory
{
    public ProductCategory Create(string name)
    {
        return new ProductCategory
        {
            Name = name
        };
    }
}
