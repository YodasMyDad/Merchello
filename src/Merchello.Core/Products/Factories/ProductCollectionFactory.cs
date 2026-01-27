using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Factories;

public class ProductCollectionFactory
{
    public ProductCollection Create(string name)
    {
        return new ProductCollection
        {
            Id = Guid.NewGuid(),
            Name = name
        };
    }
}
