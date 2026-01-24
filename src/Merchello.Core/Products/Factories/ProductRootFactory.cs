using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Products.Factories;

public class ProductRootFactory
{
    public ProductRoot Create(string name, TaxGroup taxGroup, ProductType productType, List<ProductOption> productOptions)
    {
        return new ProductRoot
        {
            Id = GuidExtensions.NewSequentialGuid,
            RootName = name,
            TaxGroup = taxGroup,
            TaxGroupId = taxGroup.Id,
            ProductType = productType,
            ProductTypeId = productType.Id,
            ProductOptions = productOptions
        };
    }

    public ProductRoot Create(
        string name,
        string rootUrl,
        TaxGroup taxGroup,
        ProductType productType,
        List<ProductCollection>? collections = null,
        bool isDigitalProduct = false,
        List<string>? rootImages = null)
    {
        return new ProductRoot
        {
            Id = GuidExtensions.NewSequentialGuid,
            RootName = name,
            RootUrl = rootUrl,
            TaxGroup = taxGroup,
            TaxGroupId = taxGroup.Id,
            ProductType = productType,
            ProductTypeId = productType.Id,
            Collections = collections ?? [],
            IsDigitalProduct = isDigitalProduct,
            RootImages = rootImages ?? []
        };
    }
}
