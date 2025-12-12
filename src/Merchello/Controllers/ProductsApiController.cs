using Asp.Versioning;
using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class ProductsApiController(
    IProductService productService,
    IOptions<MerchelloSettings> merchelloSettings) : MerchelloApiControllerBase
{
    private readonly MerchelloSettings _settings = merchelloSettings.Value;
    #region Product Detail Endpoints

    /// <summary>
    /// Gets a full product root with all variants, options, and details
    /// </summary>
    [HttpGet("products/{id:guid}")]
    [ProducesResponseType<ProductRootDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProductDetail(Guid id)
    {
        var product = await productService.GetProductRootWithDetails(id);
        if (product == null)
        {
            return NotFound();
        }
        return Ok(product);
    }

    /// <summary>
    /// Creates a new product root with a default variant
    /// </summary>
    [HttpPost("products")]
    [ProducesResponseType<ProductRootDetailDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRootRequest request)
    {
        var result = await productService.CreateProductRoot(request);
        if (!result.Successful)
        {
            return BadRequest(new { errors = result.Messages.Where(m => m.ResultMessageType == ResultMessageType.Error).Select(m => m.Message) });
        }

        var detail = await productService.GetProductRootWithDetails(result.ResultObject!.Id);
        return CreatedAtAction(nameof(GetProductDetail), new { id = result.ResultObject!.Id }, detail);
    }

    /// <summary>
    /// Updates an existing product root
    /// </summary>
    [HttpPut("products/{id:guid}")]
    [ProducesResponseType<ProductRootDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] UpdateProductRootRequest request)
    {
        var result = await productService.UpdateProductRoot(id, request);
        if (!result.Successful)
        {
            var errors = result.Messages.Where(m => m.ResultMessageType == ResultMessageType.Error).Select(m => m.Message).ToList();
            if (errors.Any(e => e?.Contains("not found") == true))
            {
                return NotFound();
            }
            return BadRequest(new { errors });
        }

        var detail = await productService.GetProductRootWithDetails(id);
        return Ok(detail);
    }

    /// <summary>
    /// Deletes a product root and all its variants
    /// </summary>
    [HttpDelete("products/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteProduct(Guid id)
    {
        var result = await productService.DeleteProductRoot(id);
        if (!result.Successful)
        {
            return NotFound();
        }
        return NoContent();
    }

    #endregion

    #region Variant Endpoints

    /// <summary>
    /// Gets a specific variant by product root ID and variant ID
    /// </summary>
    [HttpGet("products/{productRootId:guid}/variants/{variantId:guid}")]
    [ProducesResponseType<ProductVariantDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetVariant(Guid productRootId, Guid variantId)
    {
        var variant = await productService.GetVariant(productRootId, variantId);
        if (variant == null)
        {
            return NotFound();
        }

        return Ok(MapToVariantDto(variant));
    }

    /// <summary>
    /// Updates a specific variant
    /// </summary>
    [HttpPut("products/{productRootId:guid}/variants/{variantId:guid}")]
    [ProducesResponseType<ProductVariantDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateVariant(Guid productRootId, Guid variantId, [FromBody] UpdateVariantRequest request)
    {
        var result = await productService.UpdateVariant(productRootId, variantId, request);
        if (!result.Successful)
        {
            var errors = result.Messages.Where(m => m.ResultMessageType == ResultMessageType.Error).Select(m => m.Message).ToList();
            if (errors.Any(e => e?.Contains("not found") == true))
            {
                return NotFound();
            }
            return BadRequest(new { errors });
        }

        return Ok(MapToVariantDto(result.ResultObject!));
    }

    /// <summary>
    /// Sets a variant as the default for the product
    /// </summary>
    [HttpPut("products/{productRootId:guid}/variants/{variantId:guid}/set-default")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetDefaultVariant(Guid productRootId, Guid variantId)
    {
        var result = await productService.SetDefaultVariant(variantId);
        if (!result.Successful)
        {
            return NotFound();
        }
        return NoContent();
    }

    #endregion

    #region Options Endpoints

    /// <summary>
    /// Saves all product options (creates new, updates existing, deletes removed)
    /// </summary>
    [HttpPut("products/{productRootId:guid}/options")]
    [ProducesResponseType<List<ProductOptionDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SaveOptions(Guid productRootId, [FromBody] List<SaveProductOptionRequest> options)
    {
        var result = await productService.SaveProductOptions(productRootId, options);
        if (!result.Successful)
        {
            var errors = result.Messages.Where(m => m.ResultMessageType == ResultMessageType.Error).Select(m => m.Message).ToList();
            if (errors.Any(e => e?.Contains("not found") == true))
            {
                return NotFound();
            }
            return BadRequest(new { errors });
        }

        return Ok(result.ResultObject!.Select(MapToOptionDto).ToList());
    }

    #endregion

    #region Product List Endpoints

    [HttpGet("products")]
    [ProducesResponseType<ProductPageDto>(StatusCodes.Status200OK)]
    public async Task<ProductPageDto> GetProducts([FromQuery] ProductQueryDto query)
    {
        var parameters = new ProductQueryParameters
        {
            CurrentPage = query.Page,
            AmountPerPage = query.PageSize,
            ProductTypeKey = query.ProductTypeId,
            NoTracking = true,
            IncludeProductWarehouses = true,
            IncludeSiblingVariants = true,
            IncludeProductRootWarehouses = true,
            AllVariants = false,
            // DB-level filtering via service
            Search = query.Search,
            AvailabilityFilter = MapAvailabilityFilter(query.Availability),
            StockStatusFilter = MapStockStatusFilter(query.StockStatus),
            LowStockThreshold = _settings.LowStockThreshold,
            // Sorting by name at DB level
            OrderBy = ProductOrderBy.ProductRoot
        };

        if (query.CategoryId.HasValue)
        {
            parameters.CategoryIds = [query.CategoryId.Value];
        }

        var result = await productService.QueryProducts(parameters);

        var items = result.Items.Select(MapToListItem).ToList();

        return new ProductPageDto
        {
            Items = items,
            Page = result.PageIndex,
            PageSize = query.PageSize,
            TotalItems = result.TotalItems,
            TotalPages = result.TotalPages
        };
    }

    /// <summary>
    /// Maps availability filter string to enum
    /// </summary>
    private static ProductAvailabilityFilter MapAvailabilityFilter(string? availability)
    {
        return availability?.ToLower() switch
        {
            "available" => ProductAvailabilityFilter.Available,
            "unavailable" => ProductAvailabilityFilter.Unavailable,
            _ => ProductAvailabilityFilter.All
        };
    }

    /// <summary>
    /// Maps stock status filter string to enum
    /// </summary>
    private static ProductStockStatusFilter MapStockStatusFilter(string? stockStatus)
    {
        return stockStatus?.ToLower() switch
        {
            "in-stock" => ProductStockStatusFilter.InStock,
            "low-stock" => ProductStockStatusFilter.LowStock,
            "out-of-stock" => ProductStockStatusFilter.OutOfStock,
            _ => ProductStockStatusFilter.All
        };
    }

    [HttpGet("products/types")]
    [ProducesResponseType<List<ProductTypeDto>>(StatusCodes.Status200OK)]
    public async Task<List<ProductTypeDto>> GetProductTypes()
    {
        var types = await productService.GetProductTypes();
        return types.Select(t => new ProductTypeDto { Id = t.Id, Name = t.Name ?? string.Empty, Alias = t.Alias }).ToList();
    }

    [HttpGet("products/categories")]
    [ProducesResponseType<List<ProductCategoryDto>>(StatusCodes.Status200OK)]
    public async Task<List<ProductCategoryDto>> GetProductCategories()
    {
        var categories = await productService.GetProductCategories();
        return categories.Select(c => new ProductCategoryDto { Id = c.Id, Name = c.Name ?? string.Empty }).ToList();
    }

    private static ProductListItemDto MapToListItem(Product product)
    {
        var totalStock = product.ProductWarehouses?.Sum(pw => pw.Stock) ?? 0;
        var variants = product.ProductRoot?.Products;
        var variantCount = variants?.Count ?? 1;

        // Calculate price range from all variants
        decimal? minPrice = null;
        decimal? maxPrice = null;
        if (variants != null && variants.Count > 1)
        {
            minPrice = variants.Min(v => v.Price);
            maxPrice = variants.Max(v => v.Price);
        }

        // Calculate warning fields
        var productRootWarehouses = product.ProductRoot?.ProductRootWarehouses;
        var hasWarehouse = productRootWarehouses?.Any() == true;
        var hasShippingOptions = productRootWarehouses?.Any(prw =>
            prw.Warehouse?.ShippingOptions?.Any() == true) == true;
        var isDigitalProduct = product.ProductRoot?.IsDigitalProduct == true;

        return new ProductListItemDto
        {
            Id = product.Id,
            ProductRootId = product.ProductRootId,
            RootName = product.ProductRoot?.RootName ?? product.Name ?? "Unknown",
            Sku = variantCount > 1 ? null : product.Sku,
            Price = product.Price,
            MinPrice = minPrice,
            MaxPrice = maxPrice,
            Purchaseable = product.AvailableForPurchase && product.CanPurchase,
            TotalStock = totalStock,
            VariantCount = variantCount,
            ProductTypeName = product.ProductRoot?.ProductType?.Name ?? "",
            CategoryNames = product.ProductRoot?.Categories?.Select(c => c.Name ?? string.Empty).ToList() ?? [],
            ImageUrl = product.Images.FirstOrDefault() ?? product.ProductRoot?.RootImages.FirstOrDefault(),
            HasWarehouse = hasWarehouse,
            HasShippingOptions = hasShippingOptions,
            IsDigitalProduct = isDigitalProduct
        };
    }

    #endregion

    #region Mapping Helpers

    private static ProductVariantDto MapToVariantDto(Product product)
    {
        return new ProductVariantDto
        {
            Id = product.Id,
            ProductRootId = product.ProductRootId,
            Default = product.Default,
            Name = product.Name,
            Sku = product.Sku,
            Gtin = product.Gtin,
            SupplierSku = product.SupplierSku,
            Price = product.Price,
            CostOfGoods = product.CostOfGoods,
            OnSale = product.OnSale,
            PreviousPrice = product.PreviousPrice,
            AvailableForPurchase = product.AvailableForPurchase,
            CanPurchase = product.CanPurchase,
            Images = product.Images.Select(s => Guid.TryParse(s, out var g) ? g : Guid.Empty).Where(g => g != Guid.Empty).ToList(),
            ExcludeRootProductImages = product.ExcludeRootProductImages,
            Url = product.Url,
            VariantOptionsKey = product.VariantOptionsKey,
            HsCode = product.HsCode,
            PackageConfigurations = product.PackageConfigurations.Select(p => new ProductPackageDto
            {
                Weight = p.Weight,
                LengthCm = p.LengthCm,
                WidthCm = p.WidthCm,
                HeightCm = p.HeightCm
            }).ToList(),
            ShoppingFeedTitle = product.ShoppingFeedTitle,
            ShoppingFeedDescription = product.ShoppingFeedDescription,
            ShoppingFeedColour = product.ShoppingFeedColour,
            ShoppingFeedMaterial = product.ShoppingFeedMaterial,
            ShoppingFeedSize = product.ShoppingFeedSize,
            RemoveFromFeed = product.RemoveFromFeed,
            TotalStock = product.ProductWarehouses?.Sum(pw => pw.Stock) ?? 0,
            WarehouseStock = product.ProductWarehouses?.Select(pw => new VariantWarehouseStockDto
            {
                WarehouseId = pw.WarehouseId,
                WarehouseName = pw.Warehouse?.Name,
                Stock = pw.Stock,
                ReorderPoint = pw.ReorderPoint,
                ReorderQuantity = pw.ReorderQuantity,
                TrackStock = pw.TrackStock
            }).ToList() ?? []
        };
    }

    private static ProductOptionDto MapToOptionDto(ProductOption option)
    {
        return new ProductOptionDto
        {
            Id = option.Id,
            Name = option.Name ?? string.Empty,
            Alias = option.Alias,
            SortOrder = option.SortOrder,
            OptionTypeAlias = option.OptionTypeAlias,
            OptionUiAlias = option.OptionUiAlias,
            IsVariant = option.IsVariant,
            Values = option.ProductOptionValues.OrderBy(v => v.SortOrder).Select(MapToOptionValueDto).ToList()
        };
    }

    private static ProductOptionValueDto MapToOptionValueDto(ProductOptionValue value)
    {
        return new ProductOptionValueDto
        {
            Id = value.Id,
            Name = value.Name ?? string.Empty,
            FullName = value.FullName,
            SortOrder = value.SortOrder,
            HexValue = value.HexValue,
            MediaKey = value.MediaKey,
            PriceAdjustment = value.PriceAdjustment,
            CostAdjustment = value.CostAdjustment,
            SkuSuffix = value.SkuSuffix
        };
    }

    #endregion
}
