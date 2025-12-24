using Asp.Versioning;
using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class ProductsApiController(
    IProductService productService,
    IShippingService shippingService,
    IDataTypeService dataTypeService,
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
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRootDto request)
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
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] UpdateProductRootDto request)
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
    public async Task<IActionResult> UpdateVariant(Guid productRootId, Guid variantId, [FromBody] UpdateVariantDto request)
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

    /// <summary>
    /// Gets product variants by their IDs. Used by property editors to verify existence
    /// and load display data for selected products. Returns lookup results with a 'found' flag
    /// to detect deleted products.
    /// </summary>
    [HttpPost("products/variants/by-ids")]
    [ProducesResponseType<List<VariantLookupDto>>(StatusCodes.Status200OK)]
    public async Task<List<VariantLookupDto>> GetVariantsByIds([FromBody] List<Guid> variantIds)
    {
        var variants = await productService.GetVariantsByIds(variantIds);

        // Build results for all requested IDs, marking missing ones as not found
        var results = new List<VariantLookupDto>();
        foreach (var requestedId in variantIds)
        {
            var variant = variants.FirstOrDefault(v => v.Id == requestedId);
            if (variant != null)
            {
                // Get the first image URL, falling back to root images
                var imageUrl = variant.Images.FirstOrDefault()
                    ?? variant.ProductRoot?.RootImages.FirstOrDefault();

                results.Add(new VariantLookupDto
                {
                    Id = variant.Id,
                    Found = true,
                    ProductRootId = variant.ProductRootId,
                    RootName = variant.ProductRoot?.RootName,
                    Name = variant.Name,
                    Sku = variant.Sku,
                    Price = variant.Price,
                    ImageUrl = imageUrl
                });
            }
            else
            {
                // Not found - mark as such
                results.Add(new VariantLookupDto
                {
                    Id = requestedId,
                    Found = false
                });
            }
        }

        return results;
    }

    #endregion

    #region Shipping Exclusions Endpoints

    /// <summary>
    /// Gets available shipping options for a product with exclusion status.
    /// </summary>
    [HttpGet("products/{productRootId:guid}/shipping-options")]
    [ProducesResponseType<List<ShippingOptionExclusionDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProductShippingOptions(
        Guid productRootId,
        CancellationToken cancellationToken)
    {
        var options = await productService.GetAvailableShippingOptionsAsync(productRootId, cancellationToken);
        if (options == null) return NotFound();
        return Ok(options);
    }

    /// <summary>
    /// Updates shipping exclusions for all variants (bulk mode).
    /// </summary>
    [HttpPut("products/{productRootId:guid}/shipping-exclusions")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProductShippingExclusions(
        Guid productRootId,
        [FromBody] UpdateShippingExclusionsDto request,
        CancellationToken cancellationToken)
    {
        var result = await productService.UpdateProductRootExcludedShippingOptionsAsync(
            productRootId,
            request.ExcludedShippingOptionIds,
            cancellationToken);

        if (!result.Successful) return NotFound();
        return NoContent();
    }

    /// <summary>
    /// Updates shipping exclusions for a specific variant.
    /// </summary>
    [HttpPut("products/{productRootId:guid}/variants/{variantId:guid}/shipping-exclusions")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateVariantShippingExclusions(
        Guid productRootId,
        Guid variantId,
        [FromBody] UpdateShippingExclusionsDto request,
        CancellationToken cancellationToken)
    {
        var result = await productService.UpdateVariantExcludedShippingOptions(
            variantId,
            request.ExcludedShippingOptionIds,
            cancellationToken);

        if (!result.Successful) return NotFound();
        return NoContent();
    }

    /// <summary>
    /// Gets fulfillment options for a product variant to a destination.
    /// Returns the best warehouse that can fulfill based on priority, region eligibility, and stock.
    /// Used by product picker modal to determine shipping eligibility in a single API call.
    /// </summary>
    [HttpGet("products/variants/{variantId:guid}/fulfillment-options")]
    [ProducesResponseType<ProductFulfillmentOptionsDto>(StatusCodes.Status200OK)]
    public async Task<ProductFulfillmentOptionsDto> GetFulfillmentOptionsForProduct(
        Guid variantId,
        [FromQuery] string destinationCountryCode,
        [FromQuery] string? destinationStateCode = null,
        CancellationToken cancellationToken = default)
    {
        return await shippingService.GetFulfillmentOptionsForProductAsync(
            variantId,
            destinationCountryCode,
            destinationStateCode,
            cancellationToken);
    }

    /// <summary>
    /// Gets the default fulfilling warehouse for a product variant based on priority and stock.
    /// Used when no destination address is known (e.g., browsing products before checkout).
    /// Unlike fulfillment-options endpoint, this does NOT check region serviceability.
    /// </summary>
    [HttpGet("products/variants/{variantId:guid}/default-warehouse")]
    [ProducesResponseType<ProductFulfillmentOptionsDto>(StatusCodes.Status200OK)]
    public async Task<ProductFulfillmentOptionsDto> GetDefaultFulfillingWarehouse(
        Guid variantId,
        CancellationToken cancellationToken = default)
    {
        return await shippingService.GetDefaultFulfillingWarehouseAsync(variantId, cancellationToken);
    }

    /// <summary>
    /// Calculates the total price for a variant with selected add-ons.
    /// Backend-calculated to ensure proper currency handling.
    /// Used by product picker modal to show price preview during addon selection.
    /// </summary>
    [HttpPost("products/variants/{variantId:guid}/preview-addon-price")]
    [ProducesResponseType<AddonPricePreviewDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PreviewAddonPrice(
        Guid variantId,
        [FromBody] AddonPricePreviewRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var result = await productService.PreviewAddonPriceAsync(variantId, request, cancellationToken);
        if (result == null)
        {
            return NotFound();
        }
        return Ok(result);
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
    public async Task<IActionResult> SaveOptions(Guid productRootId, [FromBody] List<SaveProductOptionDto> options)
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

        if (query.CollectionId.HasValue)
        {
            parameters.CollectionIds = [query.CollectionId.Value];
        }

        var result = await productService.QueryProducts(parameters);

        var items = result.Items.Select(p => MapToListItem(p, _settings.LowStockThreshold)).ToList();

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

    [HttpPost("products/types")]
    [ProducesResponseType<ProductTypeDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateProductType([FromBody] CreateProductTypeDto request)
    {
        var result = await productService.CreateProductType(request.Name);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault(m => m.ResultMessageType == ResultMessageType.Error)?.Message;
            return BadRequest(new ProblemDetails { Title = "Failed to create product type", Detail = errorMessage });
        }

        var productType = result.ResultObject!;
        return Ok(new ProductTypeDto { Id = productType.Id, Name = productType.Name ?? string.Empty, Alias = productType.Alias });
    }

    [HttpPut("products/types/{id:guid}")]
    [ProducesResponseType<ProductTypeDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProductType(Guid id, [FromBody] UpdateProductTypeDto request)
    {
        var result = await productService.UpdateProductType(id, request.Name);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault(m => m.ResultMessageType == ResultMessageType.Error)?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound();
            }
            return BadRequest(new ProblemDetails { Title = "Failed to update product type", Detail = errorMessage });
        }

        var productType = result.ResultObject!;
        return Ok(new ProductTypeDto { Id = productType.Id, Name = productType.Name ?? string.Empty, Alias = productType.Alias });
    }

    [HttpDelete("products/types/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteProductType(Guid id)
    {
        var result = await productService.DeleteProductType(id);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault(m => m.ResultMessageType == ResultMessageType.Error)?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound();
            }
            return BadRequest(new ProblemDetails { Title = "Failed to delete product type", Detail = errorMessage });
        }

        return NoContent();
    }

    #region Collections

    [HttpGet("products/collections")]
    [ProducesResponseType<List<ProductCollectionDto>>(StatusCodes.Status200OK)]
    public async Task<List<ProductCollectionDto>> GetProductCollections()
    {
        return await productService.GetProductCollectionsWithCounts();
    }

    [HttpPost("products/collections")]
    [ProducesResponseType<ProductCollectionDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateProductCollection([FromBody] CreateProductCollectionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("Collection name is required");
        }

        var result = await productService.CreateProductCollection(dto.Name.Trim());

        if (!result.Successful)
        {
            var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to create collection";
            return BadRequest(message);
        }

        var collection = result.ResultObject!;
        return CreatedAtAction(
            nameof(GetProductCollections),
            new ProductCollectionDto
            {
                Id = collection.Id,
                Name = collection.Name ?? string.Empty,
                ProductCount = 0
            });
    }

    [HttpPut("products/collections/{id:guid}")]
    [ProducesResponseType<ProductCollectionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProductCollection(Guid id, [FromBody] UpdateProductCollectionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("Collection name is required");
        }

        var result = await productService.UpdateProductCollection(id, dto.Name.Trim());

        if (!result.Successful)
        {
            var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to update collection";
            if (message.Contains("not found", StringComparison.OrdinalIgnoreCase))
            {
                return NotFound(message);
            }
            return BadRequest(message);
        }

        var collection = result.ResultObject!;
        // Get the updated product count
        var collections = await productService.GetProductCollectionsWithCounts();
        var updatedCollection = collections.FirstOrDefault(c => c.Id == id);

        return Ok(new ProductCollectionDto
        {
            Id = collection.Id,
            Name = collection.Name ?? string.Empty,
            ProductCount = updatedCollection?.ProductCount ?? 0
        });
    }

    [HttpDelete("products/collections/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteProductCollection(Guid id)
    {
        var result = await productService.DeleteProductCollection(id);

        if (!result.Successful)
        {
            var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to delete collection";
            if (message.Contains("not found", StringComparison.OrdinalIgnoreCase))
            {
                return NotFound(message);
            }
            return BadRequest(message);
        }

        return NoContent();
    }

    #endregion

    private static ProductListItemDto MapToListItem(Product product, int lowStockThreshold)
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

        // Calculate stock status centrally
        var stockStatus = CalculateStockStatus(totalStock, isDigitalProduct, lowStockThreshold);

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
            StockStatus = stockStatus,
            VariantCount = variantCount,
            ProductTypeName = product.ProductRoot?.ProductType?.Name ?? "",
            CollectionNames = product.ProductRoot?.Collections?.Select(c => c.Name ?? string.Empty).ToList() ?? [],
            ImageUrl = product.Images.FirstOrDefault() ?? product.ProductRoot?.RootImages.FirstOrDefault(),
            HasWarehouse = hasWarehouse,
            HasShippingOptions = hasShippingOptions,
            IsDigitalProduct = isDigitalProduct
        };
    }

    /// <summary>
    /// Calculates the stock status based on available stock and threshold.
    /// This is the single source of truth for stock status calculation.
    /// </summary>
    private static StockStatus CalculateStockStatus(int totalStock, bool isDigitalProduct, int lowStockThreshold)
    {
        // Digital products don't track stock
        if (isDigitalProduct)
            return StockStatus.Untracked;
        if (totalStock <= 0)
            return StockStatus.OutOfStock;
        if (totalStock <= lowStockThreshold)
            return StockStatus.LowStock;
        return StockStatus.InStock;
    }

    #endregion

    #region Element Type Endpoints

    /// <summary>
    /// Gets the configured Element Type structure for the product workspace.
    /// Returns null if no Element Type is configured.
    /// </summary>
    [HttpGet("products/element-type")]
    [ProducesResponseType<ElementTypeDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProductElementType()
    {
        var contentType = await productService.GetProductElementTypeAsync();
        if (contentType is null)
            return Ok(null);

        var model = await MapToElementTypeResponse(contentType);
        return Ok(model);
    }

    /// <summary>
    /// Gets available product views from configured view locations.
    /// Views are discovered from files and compiled Razor Class Libraries.
    /// </summary>
    [HttpGet("products/views")]
    [ProducesResponseType<IReadOnlyList<ProductViewDto>>(StatusCodes.Status200OK)]
    public IActionResult GetAvailableViews()
    {
        var views = productService.GetAvailableViews();
        var response = views.Select(v => new ProductViewDto
        {
            Alias = v.Alias,
            VirtualPath = v.VirtualPath
        }).ToList();
        return Ok(response);
    }

    private async Task<ElementTypeDto> MapToElementTypeResponse(IContentType contentType)
    {
        // Match Umbraco's content type mapping logic:
        // - Containers can be nested by encoding hierarchy in aliases using "/" (e.g. "tabAlias/groupAlias")
        // - Property -> container mapping should be derived from the property groups' property type lists (not PropertyGroupId)
        var containerKeysByGroupAlias = contentType.PropertyGroups.ToDictionary(g => g.Alias, g => g.Key);

        Guid? GetParentKey(PropertyGroup group)
        {
            var path = group.Alias.Split('/');
            return path.Length == 1 || !containerKeysByGroupAlias.TryGetValue(path[0], out var parentKey)
                ? null
                : parentKey;
        }

        var containers = contentType.PropertyGroups
            .Select(g => new ElementTypeContainerDto
            {
                Id = g.Key,
                ParentId = GetParentKey(g),
                Name = g.Name,
                Type = g.Type.ToString(),
                SortOrder = g.SortOrder
            })
            .ToList();

        var containerKeyByPropertyKey = contentType.PropertyGroups
            .SelectMany(group => (group.PropertyTypes?.ToArray() ?? Array.Empty<PropertyType>())
                .Select(propertyType => new { propertyType.Key, GroupKey = group.Key }))
            .ToDictionary(map => map.Key, map => map.GroupKey);

        List<ElementTypePropertyDto> properties = [];
        foreach (var prop in contentType.PropertyTypes)
        {
            var containerId = containerKeyByPropertyKey.TryGetValue(prop.Key, out var groupKey) ? groupKey : (Guid?)null;
            var elementProp = await MapPropertyType(prop, containerId);
            properties.Add(elementProp);
        }

        return new ElementTypeDto
        {
            Id = contentType.Key,
            Alias = contentType.Alias,
            Name = contentType.Name ?? contentType.Alias,
            Containers = containers,
            Properties = properties
        };
    }

    private async Task<ElementTypePropertyDto> MapPropertyType(IPropertyType prop, Guid? containerId)
    {
        var dataType = await dataTypeService.GetAsync(prop.DataTypeKey);
        var configuration = dataType?.ConfigurationData
            .Select(kvp => new { alias = kvp.Key, value = kvp.Value })
            .ToArray() ?? Array.Empty<object>();

        return new ElementTypePropertyDto
        {
            Id = prop.Key,
            ContainerId = containerId,
            Alias = prop.Alias,
            Name = prop.Name ?? prop.Alias,
            Description = prop.Description,
            SortOrder = prop.SortOrder,
            DataTypeId = prop.DataTypeKey,
            PropertyEditorUiAlias = dataType?.EditorUiAlias ?? string.Empty,
            DataTypeConfiguration = configuration,
            Mandatory = prop.Mandatory,
            MandatoryMessage = prop.MandatoryMessage,
            ValidationRegex = prop.ValidationRegExp,
            ValidationRegexMessage = prop.ValidationRegExpMessage,
            LabelOnTop = prop.LabelOnTop
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
