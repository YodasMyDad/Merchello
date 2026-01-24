using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Models;
using Umbraco.Cms.Core.Models;

namespace Merchello.Core.Products.Services.Interfaces;

public interface IProductService
{
    Task<Product?> GetProduct(GetProductParameters parameters, CancellationToken cancellationToken = default);
    Task<PaginatedList<Product>> QueryProducts(ProductQueryParameters parameters, CancellationToken cancellationToken = default);

    /// <summary>
    /// Query products returning summary DTOs for list views.
    /// Uses database projection for better performance.
    /// </summary>
    Task<PaginatedList<ProductListItemDto>> QueryProductsSummary(ProductQueryParameters parameters, CancellationToken cancellationToken = default);

    Task<PaginatedList<ProductRoot>> QueryProductRoots(ProductRootQueryParameters parameters, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the min and max price for products in a collection using SQL aggregation.
    /// More efficient than loading all products into memory.
    /// </summary>
    Task<(decimal MinPrice, decimal MaxPrice)> GetPriceRangeForCollection(Guid collectionId, CancellationToken cancellationToken = default);

    // Wizard creation methods
    Task<CrudResult<ProductRoot>> CreateProductRootOnly(CreateProductRootOnlyParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductOption>> AddProductOption(AddProductOptionParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> RemoveProductOption(Guid productRootId, Guid optionId, CancellationToken cancellationToken = default);
    Task<CrudResult<List<Product>>> GenerateVariantsFromOptions(GenerateVariantsParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> UpdateVariantStock(UpdateVariantStockParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> ApplyStockTemplateToAllVariants(ApplyStockTemplateParameters parameters, CancellationToken cancellationToken = default);
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

    /// <summary>
    /// Checks if the current default variant is available. If not, reassigns to the
    /// cheapest available variant. Called automatically when stock or availability changes.
    /// </summary>
    Task<CrudResult<bool>> EnsureDefaultVariantIsAvailableAsync(Guid productRootId, CancellationToken cancellationToken = default);

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
    /// Gets product display names by their IDs in a single batch query.
    /// Returns the ProductRoot name or SKU for each product.
    /// </summary>
    Task<Dictionary<Guid, string>> GetProductNamesByIdsAsync(IEnumerable<Guid> productIds, CancellationToken cancellationToken = default);

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
