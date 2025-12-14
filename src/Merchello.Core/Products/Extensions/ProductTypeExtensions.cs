using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Extensions;

public static class ProductTypeExtensions
{
    /// <summary>
    /// Creates a new ProductType with default values
    /// </summary>
    public static ProductType CreateProductType(this ProductTypeFactory factory, string name, string? alias = null)
    {
        return factory.Create(name, alias ?? name.ToLower().Replace(" ", "-"));
    }
}
