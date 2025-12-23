using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Factories;

public class ProductRootFactory
{
    public ProductRoot Create(string name, TaxGroup taxGroup, ProductType productType, List<ProductOption> productOptions)
    {
        return new ProductRoot
        {
            RootName = name,
            TaxGroup = taxGroup,
            ProductType = productType,
            ProductOptions = productOptions
        };
    }
}
