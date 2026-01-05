# Product Search System

## Overview

A pluggable product search system with provider architecture supporting full-text search, faceted filtering, autocomplete, and extensibility for external search services (Algolia, Elasticsearch, etc.).

## Gap Analysis

| Feature | Shopify | Merchello | Status |
|---------|---------|-----------|--------|
| Full-text search | Yes | No | **Missing** |
| Autocomplete | Yes | No | **Missing** |
| Faceted filtering | Yes | Partial (filters exist) | **Extend** |
| Search suggestions | Yes | No | **Missing** |
| Relevance sorting | Yes | No | **Missing** |
| Typo tolerance | Yes | No | **Missing** |
| Search analytics | Yes | No | **Missing** |

---

## Architecture

### Provider Pattern

Following Merchello's existing patterns (`IShippingProvider`, `IPaymentProvider`):

```
ISearchProvider (Interface)
    ↓
SearchProviderBase (Base class)
    ↓
DatabaseSearchProvider (Built-in)
AlgoliaSearchProvider (External)
ElasticsearchSearchProvider (External)
```

---

## File Structure

```
src/Merchello.Core/
  Search/
    Providers/
      Interfaces/
        ISearchProvider.cs
        ISearchProviderManager.cs
      Models/
        SearchProviderMetadata.cs
        SearchProviderConfiguration.cs
        SearchProviderConfigurationField.cs
        RegisteredSearchProvider.cs
      BuiltIn/
        DatabaseSearchProvider.cs
      SearchProviderBase.cs
      SearchProviderManager.cs
    Models/
      SearchQuery.cs
      SearchResult.cs
      SearchFacet.cs
      SearchFacetValue.cs
      SearchSuggestion.cs
      SearchSortOption.cs
      IndexedProduct.cs
      SearchIndexStats.cs
    Dtos/
      SearchQueryDto.cs
      SearchResultDto.cs
      SearchFacetDto.cs
      SearchSuggestionDto.cs
      SearchConfigurationDto.cs
    Services/
      Interfaces/
        IProductSearchService.cs
      ProductSearchService.cs
      Parameters/
        SearchParameters.cs
    Notifications/
      ProductIndexingNotification.cs
      ProductIndexedNotification.cs
      SearchReindexStartedNotification.cs
      SearchReindexCompletedNotification.cs
    Mapping/
      SearchProviderDbMapping.cs
    Factories/
      SearchResultFactory.cs

src/Merchello/
  Controllers/
    SearchApiController.cs
    SearchProvidersApiController.cs

src/Merchello/Client/src/
  search/
    types/
      search.types.ts
    components/
      search-providers-list.element.ts
      search-config.element.ts
    modals/
      search-provider-config-modal.element.ts
    manifest.ts
```

---

## Provider Interface

### ISearchProvider.cs

```csharp
public interface ISearchProvider
{
    /// <summary>
    /// Static metadata describing the provider.
    /// </summary>
    SearchProviderMetadata Metadata { get; }

    /// <summary>
    /// Gets the configuration fields required by this provider.
    /// </summary>
    ValueTask<IEnumerable<SearchProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Applies persisted configuration for the provider.
    /// </summary>
    ValueTask ConfigureAsync(SearchProviderConfiguration? configuration,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates the current configuration.
    /// </summary>
    Task<SearchProviderValidationResult> ValidateConfigurationAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes a search query.
    /// </summary>
    Task<SearchResult> SearchAsync(SearchQuery query,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets autocomplete suggestions.
    /// </summary>
    Task<IReadOnlyList<SearchSuggestion>> GetSuggestionsAsync(string prefix, int limit = 10,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets available facets for filtering.
    /// </summary>
    Task<IReadOnlyList<SearchFacet>> GetFacetsAsync(SearchQuery query,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Indexes a single product.
    /// </summary>
    Task IndexProductAsync(IndexedProduct product,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes a product from the index.
    /// </summary>
    Task RemoveProductAsync(Guid productRootId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Rebuilds the entire search index.
    /// </summary>
    Task ReindexAllAsync(IAsyncEnumerable<IndexedProduct> products,
        IProgress<int>? progress = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Clears the search index.
    /// </summary>
    Task ClearIndexAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets index statistics.
    /// </summary>
    Task<SearchIndexStats> GetIndexStatsAsync(CancellationToken cancellationToken = default);
}
```

### SearchProviderMetadata.cs

```csharp
public record SearchProviderMetadata
{
    public required string Key { get; init; }
    public required string DisplayName { get; init; }
    public string? Icon { get; init; }
    public string? Description { get; init; }
    public string? SetupInstructions { get; init; }
    public bool SupportsFuzzySearch { get; init; }
    public bool SupportsFacets { get; init; }
    public bool SupportsSuggestions { get; init; }
    public bool SupportsRelevanceSort { get; init; }
    public bool IsExternalService { get; init; }
}
```

---

## Search Models

### SearchQuery.cs

```csharp
public class SearchQuery
{
    public string? Term { get; set; }
    public List<Guid>? CollectionIds { get; set; }
    public Guid? ProductTypeId { get; set; }
    public Dictionary<Guid, List<Guid>>? Filters { get; set; }  // FilterGroupId -> FilterIds
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public bool? InStockOnly { get; set; }
    public bool? AvailableOnly { get; set; }
    public SearchSortOption SortBy { get; set; } = SearchSortOption.Relevance;
    public bool SortDescending { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public bool IncludeFacets { get; set; } = true;
    public Guid? WarehouseId { get; set; }
    public string? Culture { get; set; }
}

public enum SearchSortOption
{
    Relevance,
    PriceAsc,
    PriceDesc,
    NameAsc,
    NameDesc,
    Newest,
    Popularity,
    BestSelling
}
```

### SearchResult.cs

```csharp
public class SearchResult
{
    public List<SearchResultProduct> Products { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public List<SearchFacet> Facets { get; set; } = [];
    public (decimal Min, decimal Max)? PriceRange { get; set; }
    public long QueryTimeMs { get; set; }
    public List<string>? SpellingSuggestions { get; set; }
}

public class SearchResultProduct
{
    public Guid ProductRootId { get; set; }
    public Guid DefaultVariantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public decimal Price { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public string? ImageUrl { get; set; }
    public string? RootUrl { get; set; }
    public bool OnSale { get; set; }
    public decimal? PreviousPrice { get; set; }
    public bool InStock { get; set; }
    public string? ProductTypeName { get; set; }
    public List<string> CollectionNames { get; set; } = [];
    public int VariantCount { get; set; }
    public float? RelevanceScore { get; set; }
}
```

### SearchFacet.cs

```csharp
public class SearchFacet
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string FacetType { get; set; } = "attribute";
    public List<SearchFacetValue> Values { get; set; } = [];
}

public class SearchFacetValue
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Count { get; set; }
    public bool Selected { get; set; }
    public string? HexColor { get; set; }
    public string? ImageUrl { get; set; }
}
```

### IndexedProduct.cs

```csharp
public class IndexedProduct
{
    public Guid ProductRootId { get; set; }
    public Guid DefaultVariantId { get; set; }

    // Text fields for full-text search
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string> Skus { get; set; } = [];
    public List<string> Gtins { get; set; } = [];
    public string? ProductTypeName { get; set; }
    public List<string> CollectionNames { get; set; } = [];
    public List<string> FilterValues { get; set; } = [];
    public List<string> OptionValues { get; set; } = [];

    // Structured data for filtering
    public Guid ProductTypeId { get; set; }
    public List<Guid> CollectionIds { get; set; } = [];
    public Dictionary<Guid, List<Guid>> FiltersByGroup { get; set; } = [];
    public List<Guid> WarehouseIds { get; set; } = [];

    // Pricing
    public decimal Price { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public bool OnSale { get; set; }
    public decimal? PreviousPrice { get; set; }

    // Availability
    public bool AvailableForPurchase { get; set; }
    public bool InStock { get; set; }
    public int TotalStock { get; set; }

    // Display
    public string? ImageUrl { get; set; }
    public string? RootUrl { get; set; }
    public int VariantCount { get; set; }

    // Sorting
    public DateTime DateCreated { get; set; }
    public int SalesCount { get; set; }

    // SEO
    public bool NoIndex { get; set; }
}
```

---

## Service Layer

### IProductSearchService.cs

```csharp
public interface IProductSearchService
{
    Task<SearchResult> SearchAsync(SearchQuery query,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SearchSuggestion>> GetSuggestionsAsync(string prefix, int limit = 10,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SearchFacet>> GetFacetsAsync(SearchQuery query,
        CancellationToken cancellationToken = default);

    Task IndexProductAsync(Guid productRootId,
        CancellationToken cancellationToken = default);

    Task RemoveProductAsync(Guid productRootId,
        CancellationToken cancellationToken = default);

    Task ReindexAllAsync(IProgress<int>? progress = null,
        CancellationToken cancellationToken = default);

    Task<SearchIndexStats> GetIndexStatsAsync(
        CancellationToken cancellationToken = default);

    Task<SearchProviderInfo?> GetActiveProviderInfoAsync(
        CancellationToken cancellationToken = default);
}
```

---

## Built-in Database Provider

### DatabaseSearchProvider.cs

```csharp
public class DatabaseSearchProvider(
    IEFCoreScopeProvider<MerchelloDbContext> scopeProvider,
    ILogger<DatabaseSearchProvider> logger) : SearchProviderBase
{
    public override SearchProviderMetadata Metadata => new()
    {
        Key = "database",
        DisplayName = "Database Search",
        Description = "Built-in search using database queries. Suitable for smaller catalogs.",
        Icon = "icon-server",
        SupportsFuzzySearch = false,
        SupportsFacets = true,
        SupportsSuggestions = true,
        SupportsRelevanceSort = false,
        IsExternalService = false
    };

    public override async Task<SearchResult> SearchAsync(SearchQuery query, CancellationToken ct = default)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        using var scope = scopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var productsQuery = db.RootProducts
                .Include(p => p.Products)
                .Include(p => p.ProductType)
                .Include(p => p.Collections)
                .AsNoTracking();

            // Apply search term
            if (!string.IsNullOrWhiteSpace(query.Term))
            {
                var term = query.Term.ToLower();
                productsQuery = productsQuery.Where(p =>
                    (p.RootName != null && p.RootName.ToLower().Contains(term)) ||
                    (p.Description != null && p.Description.ToLower().Contains(term)) ||
                    p.Products.Any(v => v.Sku != null && v.Sku.ToLower().Contains(term)));
            }

            // Apply collection filter
            if (query.CollectionIds?.Any() == true)
            {
                productsQuery = productsQuery.Where(p =>
                    p.Collections.Any(c => query.CollectionIds.Contains(c.Id)));
            }

            // Apply product type filter
            if (query.ProductTypeId.HasValue)
            {
                productsQuery = productsQuery.Where(p => p.ProductTypeId == query.ProductTypeId);
            }

            // Apply price filter
            if (query.MinPrice.HasValue || query.MaxPrice.HasValue)
            {
                productsQuery = productsQuery.Where(p => p.Products.Any(v =>
                    (!query.MinPrice.HasValue || v.Price >= query.MinPrice) &&
                    (!query.MaxPrice.HasValue || v.Price <= query.MaxPrice)));
            }

            // Apply availability filter
            if (query.AvailableOnly == true)
            {
                productsQuery = productsQuery.Where(p =>
                    p.Products.Any(v => v.AvailableForPurchase && v.CanPurchase));
            }

            var totalCount = await productsQuery.CountAsync(ct);

            // Apply sorting
            productsQuery = query.SortBy switch
            {
                SearchSortOption.PriceAsc => productsQuery.OrderBy(p => p.Products.Min(v => v.Price)),
                SearchSortOption.PriceDesc => productsQuery.OrderByDescending(p => p.Products.Min(v => v.Price)),
                SearchSortOption.NameAsc => productsQuery.OrderBy(p => p.RootName),
                SearchSortOption.NameDesc => productsQuery.OrderByDescending(p => p.RootName),
                SearchSortOption.Newest => productsQuery.OrderByDescending(p => p.Products.Max(v => v.DateCreated)),
                _ => productsQuery.OrderBy(p => p.RootName)
            };

            // Apply pagination
            var skip = (query.Page - 1) * query.PageSize;
            var products = await productsQuery.Skip(skip).Take(query.PageSize).ToListAsync(ct);

            return new SearchResult
            {
                TotalCount = totalCount,
                Page = query.Page,
                PageSize = query.PageSize,
                Products = products.Select(MapToSearchResultProduct).ToList()
            };
        });

        scope.Complete();
        stopwatch.Stop();
        result.QueryTimeMs = stopwatch.ElapsedMilliseconds;

        if (query.IncludeFacets)
        {
            result.Facets = await GetFacetsAsync(query, ct);
        }

        return result;
    }

    // Index methods are no-ops for database provider
    public override Task IndexProductAsync(IndexedProduct product, CancellationToken ct = default)
        => Task.CompletedTask;

    public override Task RemoveProductAsync(Guid productRootId, CancellationToken ct = default)
        => Task.CompletedTask;

    public override Task ReindexAllAsync(IAsyncEnumerable<IndexedProduct> products,
        IProgress<int>? progress, CancellationToken ct = default)
        => Task.CompletedTask;
}
```

---

## Notification Integration

### SearchIndexNotificationHandler.cs

```csharp
public class SearchIndexNotificationHandler(
    IProductSearchService searchService,
    ILogger<SearchIndexNotificationHandler> logger) :
    INotificationAsyncHandler<ProductSavedNotification>,
    INotificationAsyncHandler<ProductDeletedNotification>
{
    public async Task HandleAsync(ProductSavedNotification notification, CancellationToken ct)
    {
        try
        {
            await searchService.IndexProductAsync(notification.Product.Id, ct);
            logger.LogDebug("Indexed product {ProductId}", notification.Product.Id);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to index product {ProductId}", notification.Product.Id);
        }
    }

    public async Task HandleAsync(ProductDeletedNotification notification, CancellationToken ct)
    {
        try
        {
            await searchService.RemoveProductAsync(notification.Product.Id, ct);
            logger.LogDebug("Removed product {ProductId} from index", notification.Product.Id);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to remove product {ProductId}", notification.Product.Id);
        }
    }
}
```

---

## API Endpoints

### SearchApiController.cs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search` | Search products |
| GET | `/search/suggest` | Get autocomplete suggestions |
| GET | `/search/facets` | Get available facets |

### SearchProvidersApiController.cs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search-providers` | Get all providers |
| GET | `/search-providers/active` | Get active provider |
| PUT | `/search-providers/{key}/activate` | Activate provider |
| POST | `/search-providers/reindex` | Trigger full reindex |
| GET | `/search-providers/stats` | Get index stats |

---

## Frontend Types

### search.types.ts

```typescript
export interface SearchQueryDto {
  q?: string;
  collectionIds?: string[];
  productTypeId?: string;
  filters?: Record<string, string[]>;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  availableOnly?: boolean;
  sortBy?: SearchSortOption;
  page?: number;
  pageSize?: number;
  includeFacets?: boolean;
}

export type SearchSortOption =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "name_desc"
  | "newest"
  | "popularity";

export interface SearchResultDto {
  products: SearchResultProductDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: SearchFacetDto[];
  priceRange?: { min: number; max: number };
  queryTimeMs: number;
  spellingSuggestions?: string[];
}

export interface SearchResultProductDto {
  productRootId: string;
  defaultVariantId: string;
  name: string;
  sku: string | null;
  price: number;
  imageUrl: string | null;
  rootUrl: string | null;
  onSale: boolean;
  inStock: boolean;
  variantCount: number;
}

export interface SearchFacetDto {
  id: string;
  name: string;
  facetType: string;
  values: SearchFacetValueDto[];
}

export interface SearchFacetValueDto {
  id: string;
  name: string;
  count: number;
  selected: boolean;
}

export interface SearchSuggestionDto {
  text: string;
  highlighted: string;
  productCount: number;
}
```

---

## Database Changes

Add to `MerchelloDbContext.cs`:

```csharp
public DbSet<SearchProviderSetting> SearchProviderSettings => Set<SearchProviderSetting>();
```

### SearchProviderSetting.cs

```csharp
public class SearchProviderSetting
{
    public Guid Id { get; set; }
    public string ProviderKey { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? SettingsJson { get; set; }
    public DateTime CreateDate { get; set; }
    public DateTime UpdateDate { get; set; }
}
```

---

## External Provider Examples

### Algolia Provider (Template)

```csharp
public class AlgoliaSearchProvider : SearchProviderBase
{
    public override SearchProviderMetadata Metadata => new()
    {
        Key = "algolia",
        DisplayName = "Algolia",
        Description = "Fast, scalable hosted search",
        Icon = "icon-search",
        SupportsFuzzySearch = true,
        SupportsFacets = true,
        SupportsSuggestions = true,
        SupportsRelevanceSort = true,
        IsExternalService = true
    };

    public override async ValueTask<IEnumerable<SearchProviderConfigurationField>>
        GetConfigurationFieldsAsync(CancellationToken ct = default)
    {
        return
        [
            new() { Key = "applicationId", Label = "Application ID", Required = true },
            new() { Key = "apiKey", Label = "Admin API Key", Required = true, Sensitive = true },
            new() { Key = "indexName", Label = "Index Name", Required = true }
        ];
    }

    // ... implement search methods using Algolia SDK
}
```

---

## Implementation Sequence

1. Create model classes (`Search/Models/`)
2. Create provider interfaces (`Search/Providers/Interfaces/`)
3. Create DTOs (`Search/Dtos/`)
4. Implement `SearchProviderBase` and `SearchProviderManager`
5. Add database entity and mapping for `SearchProviderSetting`
6. Create migration
7. Implement `DatabaseSearchProvider`
8. Implement `ProductSearchService`
9. Add notification handlers for index updates
10. Create API controllers
11. Register services in DI
12. Add API methods to `merchello-api.ts`
13. Create backoffice UI components
