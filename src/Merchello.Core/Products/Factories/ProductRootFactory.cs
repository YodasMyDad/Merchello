using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Products.Factories;

public class ProductRootFactory
{
    public ProductRoot Create(string name, TaxGroup taxGroup, ProductType productType, Warehouse warehouse, List<ShippingOption> shippingOptions, List<ProductOption> productOptions)
    {
        return new ProductRoot
        {
            RootName = name,
            TaxGroup = taxGroup,
            ProductType = productType,
            //Warehouse = warehouse,
            ProductOptions = productOptions
        };
    }
}
