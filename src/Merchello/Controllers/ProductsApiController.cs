using Asp.Versioning;
using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class ProductsApiController(IProductService productService) : MerchelloApiControllerBase
{
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
            AllVariants = false
        };

        if (query.CategoryId.HasValue)
        {
            parameters.CategoryIds = [query.CategoryId.Value];
        }

        var result = await productService.QueryProducts(parameters);

        var items = result.Items.Select(MapToListItem).ToList();

        items = ApplyFilters(items, query);

        // Sort alphabetically by name
        items = items.OrderBy(p => p.RootName, StringComparer.OrdinalIgnoreCase).ToList();

        return new ProductPageDto
        {
            Items = items,
            Page = result.PageIndex,
            PageSize = query.PageSize,
            TotalItems = result.TotalItems,
            TotalPages = result.TotalPages
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

        return new ProductListItemDto
        {
            Id = product.Id,
            ProductRootId = product.ProductRootId,
            RootName = product.ProductRoot?.RootName ?? product.Name ?? "Unknown",
            Sku = product.Sku,
            Price = product.Price,
            MinPrice = minPrice,
            MaxPrice = maxPrice,
            Purchaseable = product.AvailableForPurchase && product.CanPurchase,
            TotalStock = totalStock,
            VariantCount = variantCount,
            ProductTypeName = product.ProductRoot?.ProductType?.Name ?? "",
            CategoryNames = product.ProductRoot?.Categories?.Select(c => c.Name ?? string.Empty).ToList() ?? [],
            ImageUrl = product.Images.FirstOrDefault() ?? product.ProductRoot?.RootImages.FirstOrDefault()
        };
    }

    private static List<ProductListItemDto> ApplyFilters(List<ProductListItemDto> items, ProductQueryDto query)
    {
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower();
            items = items.Where(p =>
                (p.RootName?.ToLower().Contains(search) == true) ||
                (p.Sku?.ToLower().Contains(search) == true)
            ).ToList();
        }

        if (!string.IsNullOrEmpty(query.Availability) && query.Availability != "all")
        {
            items = query.Availability switch
            {
                "available" => items.Where(p => p.Purchaseable).ToList(),
                "unavailable" => items.Where(p => !p.Purchaseable).ToList(),
                _ => items
            };
        }

        if (!string.IsNullOrEmpty(query.StockStatus) && query.StockStatus != "all")
        {
            items = query.StockStatus switch
            {
                "in-stock" => items.Where(p => p.TotalStock > 10).ToList(),
                "low-stock" => items.Where(p => p.TotalStock > 0 && p.TotalStock <= 10).ToList(),
                "out-of-stock" => items.Where(p => p.TotalStock <= 0).ToList(),
                _ => items
            };
        }

        return items;
    }
}
