using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Extensions;

public static class ProductCollectionExtensions
{
    /// <summary>
    /// Creates a new ProductCollection with default values
    /// </summary>
    public static ProductCollection CreateProductCollection(this ProductCollectionFactory factory, string name)
    {
        return factory.Create(name);
    }
}
