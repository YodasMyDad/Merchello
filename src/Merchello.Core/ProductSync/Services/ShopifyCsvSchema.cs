using Merchello.Core.ProductSync.Models;

namespace Merchello.Core.ProductSync.Services;

internal static class ShopifyCsvSchema
{
    public const string Handle = "Handle";
    public const string Title = "Title";
    public const string BodyHtml = "Body (HTML)";
    public const string Vendor = "Vendor";
    public const string ProductCategory = "Product Category";
    public const string Type = "Type";
    public const string Tags = "Tags";
    public const string Published = "Published";
    public const string Collection = "Collection";
    public const string Status = "Status";

    public const string Option1Name = "Option1 Name";
    public const string Option1Value = "Option1 Value";
    public const string Option2Name = "Option2 Name";
    public const string Option2Value = "Option2 Value";
    public const string Option3Name = "Option3 Name";
    public const string Option3Value = "Option3 Value";

    public const string VariantSku = "Variant SKU";
    public const string VariantPrice = "Variant Price";
    public const string VariantCompareAtPrice = "Variant Compare At Price";
    public const string VariantInventoryQty = "Variant Inventory Qty";
    public const string VariantBarcode = "Variant Barcode";
    public const string VariantImage = "Variant Image";
    public const string VariantTaxCode = "Variant Tax Code";
    public const string CostPerItem = "Cost per item";

    public const string ImageSrc = "Image Src";
    public const string ImagePosition = "Image Position";
    public const string ImageAltText = "Image Alt Text";

    public const string ExtendedAddonOptionsJson = "Merchello:AddonOptionsJson";
    public const string ExtendedOptionTypeMapJson = "Merchello:OptionTypeMapJson";
    public const string ExtendedRootExtendedDataJson = "Merchello:RootExtendedDataJson";
    public const string ExtendedVariantExtendedDataJson = "Merchello:VariantExtendedDataJson";

    private static readonly HashSet<string> StrictColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        "Handle",
        "Title",
        "Body (HTML)",
        "Vendor",
        "Product Category",
        "Type",
        "Tags",
        "Published",
        "Option1 Name",
        "Option1 Value",
        "Option2 Name",
        "Option2 Value",
        "Option3 Name",
        "Option3 Value",
        "Variant SKU",
        "Variant Grams",
        "Variant Inventory Tracker",
        "Variant Inventory Qty",
        "Variant Inventory Policy",
        "Variant Fulfillment Service",
        "Variant Price",
        "Variant Compare At Price",
        "Variant Requires Shipping",
        "Variant Taxable",
        "Variant Barcode",
        "Image Src",
        "Image Position",
        "Image Alt Text",
        "Gift Card",
        "SEO Title",
        "SEO Description",
        "Google Shopping / Google Product Category",
        "Google Shopping / Gender",
        "Google Shopping / Age Group",
        "Google Shopping / MPN",
        "Google Shopping / Condition",
        "Google Shopping / Custom Product",
        "Google Shopping / Custom Label 0",
        "Google Shopping / Custom Label 1",
        "Google Shopping / Custom Label 2",
        "Google Shopping / Custom Label 3",
        "Google Shopping / Custom Label 4",
        "Google Shopping / Variant Grouping",
        "Google Shopping / Variant MPN",
        "Google Shopping / Variant Gender",
        "Google Shopping / Variant Age Group",
        "Google Shopping / Variant Google Product Category",
        "Google Shopping / Variant Condition",
        "Google Shopping / Variant Custom Product",
        "Variant Image",
        "Variant Weight Unit",
        "Variant Tax Code",
        "Cost per item",
        "Included / United States",
        "Price / United States",
        "Compare At Price / United States",
        "Included / International",
        "Price / International",
        "Compare At Price / International",
        "Status",
        "Collection"
    };

    private static readonly HashSet<string> ExtendedColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        ExtendedAddonOptionsJson,
        ExtendedOptionTypeMapJson,
        ExtendedRootExtendedDataJson,
        ExtendedVariantExtendedDataJson
    };

    public static IReadOnlyList<string> BaseExportHeaders => [
        Handle,
        Title,
        BodyHtml,
        Vendor,
        ProductCategory,
        Type,
        Tags,
        Published,
        Option1Name,
        Option1Value,
        Option2Name,
        Option2Value,
        Option3Name,
        Option3Value,
        VariantSku,
        "Variant Grams",
        "Variant Inventory Tracker",
        VariantInventoryQty,
        "Variant Inventory Policy",
        "Variant Fulfillment Service",
        VariantPrice,
        VariantCompareAtPrice,
        "Variant Requires Shipping",
        "Variant Taxable",
        VariantBarcode,
        ImageSrc,
        ImagePosition,
        ImageAltText,
        "Gift Card",
        "SEO Title",
        "SEO Description",
        "Google Shopping / Google Product Category",
        "Google Shopping / MPN",
        "Google Shopping / Condition",
        VariantImage,
        "Variant Weight Unit",
        VariantTaxCode,
        CostPerItem,
        Status
    ];

    public static IReadOnlyList<string> ExtendedExportHeaders => [
        ..BaseExportHeaders,
        ExtendedAddonOptionsJson,
        ExtendedOptionTypeMapJson,
        ExtendedRootExtendedDataJson,
        ExtendedVariantExtendedDataJson
    ];

    public static bool IsAllowedColumn(ProductSyncProfile profile, string column)
    {
        if (StrictColumns.Contains(column))
        {
            return true;
        }

        if (column.StartsWith("Metafield:", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (profile == ProductSyncProfile.MerchelloExtended && ExtendedColumns.Contains(column))
        {
            return true;
        }

        return false;
    }

    public static bool IsExtendedColumn(string column) => ExtendedColumns.Contains(column);
}
