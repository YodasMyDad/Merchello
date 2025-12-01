using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Products.Factories;

public class ProductFactory(SlugHelper slugHelper)
{
    public Product Create(ProductRoot productRoot, string name, decimal price, decimal costOfGoods, string gtin, string sku, bool isDefault, string? variantOptionsKey = null)
    {
        return new Product
        {
            ProductRoot = productRoot,
            Name = name,
            Price = price,
            Gtin = gtin,
            Sku = sku,
            CostOfGoods = costOfGoods,
            Default = isDefault,
            VariantOptionsKey = variantOptionsKey,
            Url = slugHelper.GenerateSlug(name)
        };
    }
}
