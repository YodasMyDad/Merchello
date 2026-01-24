using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Extensions;

public static class ProductMappingExtensions
{
    public static void CopyFrom(this ProductRoot destination, ProductRoot source)
    {
        destination.RootName = source.RootName;
        destination.RootUrl = source.RootUrl;
        destination.GoogleShoppingFeedCategory = source.GoogleShoppingFeedCategory;
        destination.RootImages = source.RootImages?.ToList() ?? [];
        destination.DefaultPackageConfigurations = source.DefaultPackageConfigurations.ToList();
        destination.ProductOptions = source.ProductOptions?.ToList() ?? [];
        destination.Description = source.Description;
        destination.MetaDescription = source.MetaDescription;
        destination.PageTitle = source.PageTitle;
        destination.NoIndex = source.NoIndex;
        destination.OpenGraphImage = source.OpenGraphImage;
        destination.CanonicalUrl = source.CanonicalUrl;
        // Note: Categories, ProductType, TaxGroup are handled separately in service logic
    }

    public static void CopyFrom(this Product destination, Product source)
    {
        destination.Name = source.Name;
        destination.CostOfGoods = source.CostOfGoods;
        destination.Price = source.Price;
        destination.OnSale = source.OnSale;
        destination.PreviousPrice = source.PreviousPrice;
        destination.AvailableForPurchase = source.AvailableForPurchase;
        destination.Images = source.Images?.ToList() ?? [];
        destination.ExcludeRootProductImages = source.ExcludeRootProductImages;
        destination.Gtin = source.Gtin;
        destination.Sku = source.Sku;
        destination.SupplierSku = source.SupplierSku;
        destination.DateUpdated = source.DateUpdated;
        destination.ShoppingFeedTitle = source.ShoppingFeedTitle;
        destination.ShoppingFeedDescription = source.ShoppingFeedDescription;
        destination.ShoppingFeedColour = source.ShoppingFeedColour;
        destination.ShoppingFeedMaterial = source.ShoppingFeedMaterial;
        destination.ShoppingFeedSize = source.ShoppingFeedSize;
        destination.RemoveFromFeed = source.RemoveFromFeed;
        destination.Url = source.Url;
        destination.HsCode = source.HsCode;
        destination.PackageConfigurations = source.PackageConfigurations.ToList();
        // Not copying: ProductRoot, Filters, ShippingOptions, Default, VariantOptionsKey, Id
    }
}

