using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Extensions;

public static class ProductCategoryExtensions
{
    /// <summary>
    /// Creates a new ProductCategory with default values
    /// </summary>
    public static ProductCategory CreateProductCategory(this ProductCategoryFactory factory, string name)
    {
        return factory.Create(name);
    }
}
