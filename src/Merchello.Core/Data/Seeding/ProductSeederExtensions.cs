using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Data.Seeding;

/// <summary>
/// Extension methods for database seeding - helps create products with variants.
/// Uses ProductService methods to ensure consistency with application behavior.
/// </summary>
internal static class ProductSeederExtensions
{
    /// <summary>
    /// Creates a product root with auto-generated variants from colors and sizes.
    /// Uses ProductService methods internally to ensure proper variant key generation.
    /// Optionally assigns filters to variants based on their color/size option values.
    /// </summary>
    public static async Task<CrudResult<ProductRoot>> CreateProductRootWithVariantsAsync(
        this IProductService productService,
        IProductFilterService productFilterService,
        string name,
        string? description,
        decimal price,
        TaxGroup taxGroup,
        ProductType productType,
        List<ProductCollection>? collections = null,
        decimal? weight = null,
        string? googleShoppingCategory = null,
        string[]? colors = null,
        string[]? sizes = null,
        List<(Warehouse warehouse, int priority)>? warehouses = null,
        List<(int warehouseIndex, int minStock, int maxStock, bool trackStock)>? warehouseStockRanges = null,
        decimal costOfGoodsPercentage = 0.4m,
        Dictionary<string, Guid>? colorFilters = null,
        Dictionary<string, Guid>? sizeFilters = null,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductRoot>();
        var random = new Random(42); // Fixed seed for reproducibility
        var costOfGoods = Math.Round(price * costOfGoodsPercentage, 2, MidpointRounding.AwayFromZero);

        // Step 1: Create product root with default variant
        // ProductService handles RootUrl generation via SlugHelper
        var createRequest = new CreateProductRootDto
        {
            RootName = name,
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id,
            CollectionIds = collections?.Select(c => c.Id).ToList(),
            WarehouseIds = warehouses?.Select(w => w.warehouse.Id).ToList(),
            IsDigitalProduct = false,
            DefaultVariant = new CreateVariantDto
            {
                Name = name,
                Sku = Regex.Replace(name.ToUpperInvariant(), @"[^A-Z0-9]+", "-").Trim('-'),
                Price = price,
                CostOfGoods = costOfGoods,
                AvailableForPurchase = true,
                CanPurchase = true
            }
        };

        var createResult = await productService.CreateProductRoot(createRequest, cancellationToken);
        if (!createResult.Success || createResult.ResultObject == null)
        {
            CopyErrorMessages(createResult, result);
            return result;
        }

        var productRootId = createResult.ResultObject.Id;

        // Step 2: Update product root with additional fields (RootUrl already set by CreateProductRoot)
        var updateRequest = new UpdateProductRootDto
        {
            GoogleShoppingFeedCategory = googleShoppingCategory,
            Description = ToRichTextEditorValue(description),
            DefaultPackageConfigurations = weight.HasValue
                ? [new ProductPackageDto { Weight = weight.Value }]
                : null
        };

        var updateResult = await productService.UpdateProductRoot(productRootId, updateRequest, cancellationToken);
        if (!updateResult.Success)
        {
            CopyErrorMessages(updateResult, result);
            return result;
        }

        // Step 3: Add product options if colors/sizes specified
        var hasOptions = (colors != null && colors.Length > 0) || (sizes != null && sizes.Length > 0);

        if (hasOptions)
        {
            List<SaveProductOptionDto> options = [];

            if (colors != null && colors.Length > 0)
            {
                options.Add(new SaveProductOptionDto
                {
                    Name = "Color",
                    Alias = "color",
                    SortOrder = 1,
                    OptionTypeAlias = "color",
                    OptionUiAlias = "dropdown",
                    IsVariant = true,
                    Values = colors.Select((c, i) => new SaveOptionValueDto
                    {
                        Name = c,
                        FullName = c,
                        SortOrder = i
                    }).ToList()
                });
            }

            if (sizes != null && sizes.Length > 0)
            {
                options.Add(new SaveProductOptionDto
                {
                    Name = "Size",
                    Alias = "size",
                    SortOrder = 2,
                    OptionTypeAlias = "size",
                    OptionUiAlias = "dropdown",
                    IsVariant = true,
                    Values = sizes.Select((s, i) => new SaveOptionValueDto
                    {
                        Name = s,
                        FullName = s,
                        SortOrder = i
                    }).ToList()
                });
            }

            var optionsResult = await productService.SaveProductOptions(productRootId, options, cancellationToken);
            if (!optionsResult.Success)
            {
                CopyErrorMessages(optionsResult, result);
                return result;
            }

            // Step 4: Get product root with variants (SaveProductOptions auto-regenerates variants)
            var productRoot = await productService.GetProductRoot(productRootId, includeProducts: true, cancellationToken: cancellationToken);

            if (productRoot != null && productRoot.Products.Count > 0)
            {
                // Step 5: Update variants with images, stock, and filters
                foreach (var variant in productRoot.Products)
                {
                    // Keep variants purchasable; images remain empty unless real media keys are provided.
                    await productService.UpdateVariant(productRootId, variant.Id, new UpdateVariantDto
                    {
                        AvailableForPurchase = true
                    }, cancellationToken);

                    // Assign filters based on variant's option values (parsed from Name like "Black-M")
                    if (colorFilters != null || sizeFilters != null)
                    {
                        var filterIds = GetFilterIdsForVariant(variant.Name, colors, sizes, colorFilters, sizeFilters);
                        if (filterIds.Count > 0)
                        {
                            await productFilterService.AssignFiltersToProduct(variant.Id, filterIds, cancellationToken);
                        }
                    }

                    // Update stock for each warehouse
                    if (warehouses != null && warehouseStockRanges != null)
                    {
                        foreach (var (warehouseIndex, minStock, maxStock, trackStock) in warehouseStockRanges)
                        {
                            if (warehouseIndex < warehouses.Count)
                            {
                                var warehouse = warehouses[warehouseIndex].warehouse;
                                var stock = random.Next(minStock, maxStock + 1);
                                var reorderPoint = trackStock ? Math.Max(5, (int)(maxStock * 0.25)) : (int?)null;

                                await productService.UpdateVariantStock(
                                    new UpdateVariantStockParameters
                                    {
                                        VariantId = variant.Id,
                                        WarehouseId = warehouse.Id,
                                        Stock = stock,
                                        ReorderPoint = reorderPoint,
                                        TrackStock = trackStock
                                    },
                                    cancellationToken);
                            }
                        }
                    }
                }

                result.ResultObject = productRoot;
            }
        }
        else
        {
            // No options - just update the default variant with stock
            var productRoot = await productService.GetProductRoot(productRootId, includeProducts: true, cancellationToken: cancellationToken);

            if (productRoot != null)
            {
                var defaultVariant = productRoot.Products.FirstOrDefault();
                if (defaultVariant != null && warehouses != null && warehouseStockRanges != null)
                {
                    foreach (var (warehouseIndex, minStock, maxStock, trackStock) in warehouseStockRanges)
                    {
                        if (warehouseIndex < warehouses.Count)
                        {
                            var warehouse = warehouses[warehouseIndex].warehouse;
                            var stock = random.Next(minStock, maxStock + 1);
                            var reorderPoint = trackStock ? Math.Max(5, (int)(maxStock * 0.25)) : (int?)null;

                            await productService.UpdateVariantStock(
                                new UpdateVariantStockParameters
                                {
                                    VariantId = defaultVariant.Id,
                                    WarehouseId = warehouse.Id,
                                    Stock = stock,
                                    ReorderPoint = reorderPoint,
                                    TrackStock = trackStock
                                },
                                cancellationToken);
                        }
                    }
                }

                result.ResultObject = productRoot;
            }
        }

        return result;
    }

    private static void CopyErrorMessages<TSource, TDest>(CrudResult<TSource> source, CrudResult<TDest> dest)
    {
        foreach (var errorMessage in source.Messages.ErrorMessages())
        {
            dest.AddErrorMessage(errorMessage.Message ?? "Unknown error");
        }
    }

    /// <summary>
    /// Converts plain text description to RichTextEditorValue JSON format.
    /// The TipTap editor stores content as: { "markup": "&lt;p&gt;...&lt;/p&gt;", "blocks": null }
    /// </summary>
    private static string? ToRichTextEditorValue(string? plainText)
    {
        if (string.IsNullOrWhiteSpace(plainText))
        {
            return null;
        }

        // Wrap in paragraph tag and escape HTML entities in the text content
        var escapedText = HtmlEncoder.Default.Encode(plainText);
        var markup = $"<p>{escapedText}</p>";

        // Create the RichTextEditorValue structure
        var richTextValue = new { markup, blocks = (object?)null };

        return JsonSerializer.Serialize(richTextValue);
    }

    /// <summary>
    /// Extracts filter IDs for a variant based on its name (e.g., "Black-M" or "Navy-XL").
    /// Matches the color and size parts of the variant name to the corresponding filter IDs.
    /// </summary>
    private static List<Guid> GetFilterIdsForVariant(
        string? variantName,
        string[]? colors,
        string[]? sizes,
        Dictionary<string, Guid>? colorFilters,
        Dictionary<string, Guid>? sizeFilters)
    {
        List<Guid> filterIds = [];

        if (string.IsNullOrEmpty(variantName))
        {
            return filterIds;
        }

        // Variant names are formatted as "Color-Size" (e.g., "Black-M", "Navy-XL")
        // or just "Color" or "Size" if only one option type exists
        var parts = variantName.Split('-');

        // Try to match each part against known colors and sizes
        foreach (var part in parts)
        {
            var trimmedPart = part.Trim();

            // Check if this part is a known color
            if (colors != null && colorFilters != null)
            {
                var matchedColor = colors.FirstOrDefault(c =>
                    string.Equals(c, trimmedPart, StringComparison.OrdinalIgnoreCase));

                if (matchedColor != null && colorFilters.TryGetValue(matchedColor, out var colorFilterId))
                {
                    filterIds.Add(colorFilterId);
                }
            }

            // Check if this part is a known size
            if (sizes != null && sizeFilters != null)
            {
                var matchedSize = sizes.FirstOrDefault(s =>
                    string.Equals(s, trimmedPart, StringComparison.OrdinalIgnoreCase));

                if (matchedSize != null && sizeFilters.TryGetValue(matchedSize, out var sizeFilterId))
                {
                    filterIds.Add(sizeFilterId);
                }
            }
        }

        return filterIds;
    }
}
