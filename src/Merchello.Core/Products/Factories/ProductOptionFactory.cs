using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Factories;

public class ProductOptionFactory
{
    /// <summary>
    /// Creates an empty ProductOption for update scenarios where properties will be set later.
    /// </summary>
    public ProductOption CreateEmpty()
    {
        return new ProductOption
        {
            Id = Guid.NewGuid(),
            ProductOptionValues = []
        };
    }

    /// <summary>
    /// Creates an empty ProductOptionValue for update scenarios where properties will be set later.
    /// </summary>
    public ProductOptionValue CreateEmptyValue()
    {
        return new ProductOptionValue
        {
            Id = Guid.NewGuid()
        };
    }
}

