using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Models;
using Umbraco.Cms.Core.Models;

namespace Merchello.Core.Products.Services.Interfaces;

public interface IProductService
{
    Task<CrudResult<ProductRoot>> Update(ProductRoot productRoot);
    Task<CrudResult<ProductRoot>> Create(string name, TaxGroup taxGroup, ProductType productType, decimal price, decimal costOfGoods, string gtin, string sku, List<ProductOption> productOptions);
    Task<CrudResult<Product>> Update(Product product);
    Task<CrudResult<ProductRoot>> Delete(ProductRoot productRoot);
    Task<List<ProductFilterGroup>> GetFilterGroups(CancellationToken cancellationToken = default);
    Task<ProductCollection?> GetCollection(Guid collectionId, CancellationToken cancellationToken = default);
    Task<List<ProductCollection>> GetCollectionsByIds(IEnumerable<Guid> collectionIds, CancellationToken cancellationToken = default);
    Task<Product?> GetProduct(GetProductParameters parameters, CancellationToken cancellationToken = default);
    Task<PaginatedList<Product>> QueryProducts(ProductQueryParameters parameters, CancellationToken cancellationToken = default);
    Task<PaginatedList<ProductRoot>> QueryProductRoots(ProductRootQueryParameters parameters, CancellationToken cancellationToken = default);

    // Wizard creation methods
    Task<CrudResult<ProductRoot>> CreateProductRootOnly(string name, decimal price, decimal costOfGoods, decimal weight, Guid taxGroupId, Guid productTypeId, List<Guid> collectionIds, string? description = null, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductOption>> AddProductOption(Guid productRootId, string name, string? alias, int sortOrder, string? optionTypeAlias, string? optionUiAlias, bool isVariant, List<(string Name, string? FullName, int SortOrder, string? HexValue, decimal PriceAdjustment, decimal CostAdjustment, string? SkuSuffix)> values, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> RemoveProductOption(Guid productRootId, Guid optionId, CancellationToken cancellationToken = default);
    Task<CrudResult<List<Product>>> GenerateVariantsFromOptions(Guid productRootId, decimal defaultPrice, decimal defaultCostOfGoods, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> UpdateVariantStock(Guid variantId, Guid warehouseId, int stock, int? reorderPoint, bool trackStock, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> ApplyStockTemplateToAllVariants(Guid productRootId, Guid warehouseId, int defaultStock, int? defaultReorderPoint, bool trackStock, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> UpdateVariantExcludedShippingOptions(Guid variantId, List<Guid> excludedShippingOptionIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets available shipping options for a product with their exclusion status.
    /// </summary>
    Task<List<ShippingOptionExclusionDto>?> GetAvailableShippingOptionsAsync(Guid productRootId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates shipping exclusions for all variants of a product (bulk mode).
    /// </summary>
    Task<CrudResult<bool>> UpdateProductRootExcludedShippingOptionsAsync(Guid productRootId, List<Guid> excludedShippingOptionIds, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> SetDefaultVariant(Guid variantId, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductType>> CreateProductType(string name, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductType>> UpdateProductType(Guid id, string name, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> DeleteProductType(Guid id, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductCollection>> CreateProductCollection(string name, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductCollection>> UpdateProductCollection(Guid id, string name, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> DeleteProductCollection(Guid id, CancellationToken cancellationToken = default);
    Task<List<ProductType>> GetProductTypes(CancellationToken cancellationToken = default);
    Task<List<ProductType>> GetProductTypesByIds(IEnumerable<Guid> productTypeIds, CancellationToken cancellationToken = default);
    Task<List<ProductCollection>> GetProductCollections(CancellationToken cancellationToken = default);
    Task<List<ProductCollectionDto>> GetProductCollectionsWithCounts(CancellationToken cancellationToken = default);
    Task<ProductRoot?> GetProductRoot(Guid productRootId, bool includeProducts = false, bool includeWarehouses = false, CancellationToken cancellationToken = default);

    // Product detail view methods
    Task<ProductRootDetailDto?> GetProductRootWithDetails(Guid productRootId, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductRoot>> CreateProductRoot(CreateProductRootDto request, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductRoot>> UpdateProductRoot(Guid productRootId, UpdateProductRootDto request, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> DeleteProductRoot(Guid productRootId, CancellationToken cancellationToken = default);

    // Variant operations
    Task<Product?> GetVariant(Guid productRootId, Guid variantId, CancellationToken cancellationToken = default);
    Task<CrudResult<Product>> UpdateVariant(Guid productRootId, Guid variantId, UpdateVariantDto request, CancellationToken cancellationToken = default);

    // Options operations (variants are automatically regenerated when options are saved)
    Task<CrudResult<List<ProductOption>>> SaveProductOptions(Guid productRootId, List<SaveProductOptionDto> options, CancellationToken cancellationToken = default);

    // Filter operations
    Task<CrudResult<ProductFilterGroup>> CreateFilterGroup(string name, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductFilter>> CreateFilter(Guid filterGroupId, string name, string? hexColour = null, Guid? image = null, CancellationToken cancellationToken = default);
    Task<ProductFilterGroup?> GetFilterGroup(Guid filterGroupId, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductFilterGroup>> UpdateFilterGroup(Guid filterGroupId, string? name, int? sortOrder, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> DeleteFilterGroup(Guid filterGroupId, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> ReorderFilterGroups(List<Guid> orderedIds, CancellationToken cancellationToken = default);
    Task<ProductFilter?> GetFilter(Guid filterId, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductFilter>> UpdateFilter(Guid filterId, string? name, string? hexColour, Guid? image, int? sortOrder, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> DeleteFilter(Guid filterId, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> ReorderFilters(Guid filterGroupId, List<Guid> orderedIds, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> AssignFiltersToProduct(Guid productId, List<Guid> filterIds, CancellationToken cancellationToken = default);
    Task<List<ProductFilter>> GetFiltersForProduct(Guid productId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets filter groups by their IDs for batch loading (used by value converters).
    /// </summary>
    Task<List<ProductFilterGroup>> GetFilterGroupsByIds(IEnumerable<Guid> filterGroupIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets filters by their IDs for batch loading (used by value converters).
    /// </summary>
    Task<List<ProductFilter>> GetFiltersByIds(IEnumerable<Guid> filterIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets product variants by their IDs for batch loading (used by property editors).
    /// Returns the Product entities with ProductRoot included.
    /// </summary>
    Task<List<Product>> GetVariantsByIds(IEnumerable<Guid> variantIds, CancellationToken cancellationToken = default);

    // Query/count operations for seeding
    Task<bool> AnyProductsExistAsync(CancellationToken cancellationToken = default);
    Task<int> GetProductCountAsync(CancellationToken cancellationToken = default);
    Task<List<Product>> GetAllProductsWithTaxGroupAsync(CancellationToken cancellationToken = default);
    Task<Dictionary<string, HashSet<Guid>>> GetProductIdsByCountryAvailabilityAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the first image GUID for multiple products by their IDs.
    /// Falls back from variant images to root images.
    /// </summary>
    /// <param name="productIds">The product (variant) IDs to look up</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Dictionary mapping ProductId to first available image GUID (or null if no images)</returns>
    Task<Dictionary<Guid, string?>> GetProductImagesAsync(IEnumerable<Guid> productIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the configured Element Type for products, if any.
    /// </summary>
    Task<IContentType?> GetProductElementTypeAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Serializes element property values to JSON for storage.
    /// </summary>
    string SerializeElementProperties(Dictionary<string, object?> properties);

    /// <summary>
    /// Deserializes element property values from JSON storage.
    /// </summary>
    Dictionary<string, object?> DeserializeElementProperties(string? json);

    /// <summary>
    /// Gets a ProductRoot by its RootUrl for front-end routing.
    /// </summary>
    /// <param name="rootUrl">The root URL segment (e.g., "leather-jacket")</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>The ProductRoot with Products and ProductOptions loaded, or null if not found</returns>
    Task<ProductRoot?> GetByRootUrlAsync(string rootUrl, CancellationToken ct = default);

    /// <summary>
    /// Gets available product views from configured view locations.
    /// Views are discovered using ApplicationPartManager from files and compiled RCLs.
    /// </summary>
    IReadOnlyList<ProductViewInfo> GetAvailableViews();

    /// <summary>
    /// Calculates the total price for a variant with selected add-ons.
    /// Backend-calculated to ensure proper currency handling.
    /// </summary>
    /// <param name="variantId">The product variant ID</param>
    /// <param name="request">The selected add-ons</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Price preview with base price, addons total, and total price</returns>
    Task<AddonPricePreviewDto?> PreviewAddonPriceAsync(Guid variantId, AddonPricePreviewRequestDto request, CancellationToken cancellationToken = default);
}

/// <summary>
/// Information about a product view discovered from configured locations.
/// </summary>
/// <param name="Alias">The view alias (filename without extension, e.g., "Gallery")</param>
/// <param name="VirtualPath">The virtual path to the view (e.g., "~/Views/Products/Gallery.cshtml")</param>
public record ProductViewInfo(string Alias, string VirtualPath);

