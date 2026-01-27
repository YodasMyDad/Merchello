using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Factories;

public class ProductTypeFactory
{
    public ProductType Create(string name, string alias)
    {
        return new ProductType
        {
            Id = Guid.NewGuid(),
            Name = name,
            Alias = alias
        };
    }
}
