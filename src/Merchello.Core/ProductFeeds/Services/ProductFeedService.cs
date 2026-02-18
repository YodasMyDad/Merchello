using System.Security.Cryptography;
using System.Globalization;
using System.Text.Json;
using System.Xml.Linq;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.ProductFeeds.Dtos;
using Merchello.Core.ProductFeeds.Factories;
using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.ProductFeeds.Services;

public class ProductFeedService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ProductFeedFactory productFeedFactory,
    SlugHelper slugHelper,
    IGoogleProductFeedGenerator productFeedGenerator,
    IGooglePromotionFeedGenerator promotionFeedGenerator,
    IProductFeedResolverRegistry resolverRegistry,
    ICacheService cacheService,
    ILogger<ProductFeedService> logger) : IProductFeedService
{
    private const string FeedCacheTagPrefix = "merchello:product-feeds:";
    private const string FeedCacheKeyPrefix = "merchello:product-feeds:";
    private const int FeedSlugMaxLength = 200;
    private const int FeedSlugPrefixLength = 8;
    private const int FeedSlugCreateMaxAttempts = 10;

    private static readonly char[] SlugPrefixAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789".ToCharArray();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private static readonly HashSet<string> AllowedCustomAttributes = new(StringComparer.OrdinalIgnoreCase)
    {
        "age_group",
        "adult",
        "gender",
        "pattern",
        "size_type",
        "size_system",
        "lifestyle_image_link",
        "additional_image_link",
        "availability_date",
        "expiration_date",
        "sale_price_effective_date",
        "unit_pricing_measure",
        "unit_pricing_base_measure",
        "multipack",
        "is_bundle",
        "energy_efficiency_class",
        "min_energy_efficiency_class",
        "max_energy_efficiency_class",
        "material",
        "color",
        "shipping_label",
        "ads_redirect",
        "mobile_link",
        "product_detail",
        "product_highlight"
    };

    public async Task<List<ProductFeedListItemDto>> GetFeedsAsync(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var feeds = await scope.ExecuteWithContextAsync(async db =>
            await db.Set<ProductFeed>()
                .AsNoTracking()
                .OrderBy(x => x.Name)
                .ToListAsync(cancellationToken));
        scope.Complete();

        return feeds.Select(MapToListItemDto).ToList();
    }

    public async Task<ProductFeedDetailDto?> GetFeedAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var feed = await scope.ExecuteWithContextAsync(async db =>
            await db.Set<ProductFeed>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken));
        scope.Complete();

        return feed == null ? null : MapToDetailDto(feed);
    }

    public async Task<CrudResult<ProductFeedDetailDto>> CreateFeedAsync(CreateProductFeedDto request, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductFeedDetailDto>();

        if (!ValidateFeedRequest(request.Name, request.CountryCode, request.CurrencyCode, request.LanguageCode, result))
        {
            return result;
        }

        var baseSlug = BuildSlug(request.Slug, request.Name);
        if (string.IsNullOrWhiteSpace(baseSlug))
        {
            result.AddErrorMessage("Feed slug could not be generated.");
            return result;
        }

        var normalizedCustomFields = NormalizeAndValidateCustomFields(request.CustomFields ?? [], result);
        if (!result.Success)
        {
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var created = await scope.ExecuteWithContextAsync(async db =>
        {
            var slug = await BuildCreateSlugAsync(db, baseSlug, cancellationToken);
            if (string.IsNullOrWhiteSpace(slug))
            {
                result.AddErrorMessage("Feed slug could not be generated.");
                return (ProductFeed?)null;
            }

            var entity = productFeedFactory.Create(
                request.Name.Trim(),
                slug,
                request.CountryCode.Trim().ToUpperInvariant(),
                request.CurrencyCode.Trim().ToUpperInvariant(),
                request.LanguageCode.Trim().ToLowerInvariant(),
                request.IncludeTaxInPrice ?? GetDefaultIncludeTaxInPrice(request.CountryCode));

            entity.IsEnabled = request.IsEnabled;
            entity.FilterConfigJson = JsonSerializer.Serialize(MapFilterConfig(request.FilterConfig), JsonOptions);
            entity.CustomLabelsJson = JsonSerializer.Serialize(MapCustomLabels(request.CustomLabels ?? []), JsonOptions);
            entity.CustomFieldsJson = JsonSerializer.Serialize(MapCustomFields(normalizedCustomFields), JsonOptions);
            entity.ManualPromotionsJson = JsonSerializer.Serialize(MapManualPromotions(request.ManualPromotions ?? []), JsonOptions);

            db.Set<ProductFeed>().Add(entity);
            await db.SaveChangesAsync(cancellationToken);
            return entity;
        });
        scope.Complete();

        if (created == null)
        {
            return result;
        }

        result.ResultObject = MapToDetailDto(created);
        return result;
    }

    public async Task<CrudResult<ProductFeedDetailDto>> UpdateFeedAsync(Guid id, UpdateProductFeedDto request, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductFeedDetailDto>();

        if (!ValidateFeedRequest(request.Name, request.CountryCode, request.CurrencyCode, request.LanguageCode, result))
        {
            return result;
        }

        var normalizedCustomFields = NormalizeAndValidateCustomFields(request.CustomFields ?? [], result);
        if (!result.Success)
        {
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var updated = await scope.ExecuteWithContextAsync(async db =>
        {
            var entity = await db.Set<ProductFeed>()
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (entity == null)
            {
                result.AddErrorMessage("Feed not found.");
                return (ProductFeed?)null;
            }

            var slug = string.IsNullOrWhiteSpace(request.Slug)
                ? entity.Slug
                : BuildSlug(request.Slug, request.Name);

            if (string.IsNullOrWhiteSpace(slug))
            {
                result.AddErrorMessage("Feed slug could not be generated.");
                return (ProductFeed?)null;
            }

            var slugInUse = await db.Set<ProductFeed>()
                .AnyAsync(x => x.Slug == slug && x.Id != id, cancellationToken);
            if (slugInUse)
            {
                result.AddErrorMessage($"A feed with slug '{slug}' already exists.");
                return (ProductFeed?)null;
            }

            entity.Name = request.Name.Trim();
            entity.Slug = slug;
            entity.IsEnabled = request.IsEnabled;
            entity.CountryCode = request.CountryCode.Trim().ToUpperInvariant();
            entity.CurrencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
            entity.LanguageCode = request.LanguageCode.Trim().ToLowerInvariant();
            entity.IncludeTaxInPrice = request.IncludeTaxInPrice
                ?? entity.IncludeTaxInPrice
                ?? GetDefaultIncludeTaxInPrice(entity.CountryCode);
            entity.FilterConfigJson = JsonSerializer.Serialize(MapFilterConfig(request.FilterConfig), JsonOptions);
            entity.CustomLabelsJson = JsonSerializer.Serialize(MapCustomLabels(request.CustomLabels ?? []), JsonOptions);
            entity.CustomFieldsJson = JsonSerializer.Serialize(MapCustomFields(normalizedCustomFields), JsonOptions);
            entity.ManualPromotionsJson = JsonSerializer.Serialize(MapManualPromotions(request.ManualPromotions ?? []), JsonOptions);
            entity.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
            return entity;
        });
        scope.Complete();

        if (updated == null)
        {
            return result;
        }

        await InvalidateFeedCacheAsync(updated.Id, cancellationToken);

        result.ResultObject = MapToDetailDto(updated);
        return result;
    }

    public async Task<CrudResult<bool>> DeleteFeedAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        var deleted = await scope.ExecuteWithContextAsync(async db =>
        {
            var entity = await db.Set<ProductFeed>().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (entity == null)
            {
                result.AddErrorMessage("Feed not found.");
                return false;
            }

            db.Set<ProductFeed>().Remove(entity);
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();

        if (!deleted)
        {
            return result;
        }

        await InvalidateFeedCacheAsync(id, cancellationToken);
        result.ResultObject = true;
        return result;
    }

    public async Task<ProductFeedRebuildResultDto?> RebuildAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var feed = await scope.ExecuteWithContextAsync(async db =>
            await db.Set<ProductFeed>().FirstOrDefaultAsync(x => x.Id == id, cancellationToken));

        if (feed == null)
        {
            scope.Complete();
            return null;
        }

        try
        {
            var productResult = await productFeedGenerator.GenerateAsync(feed, cancellationToken);
            var promotionResult = await promotionFeedGenerator.GenerateAsync(feed, productResult, cancellationToken);

            feed.LastSuccessfulProductFeedXml = productResult.Xml;
            feed.LastSuccessfulPromotionsFeedXml = promotionResult.Xml;
            feed.LastGeneratedUtc = DateTime.UtcNow;
            feed.LastGenerationError = null;
            feed.DateUpdated = DateTime.UtcNow;

            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                await db.SaveChangesAsync(cancellationToken);
                return true;
            });

            scope.Complete();
            await InvalidateFeedCacheAsync(feed.Id, cancellationToken);

            return new ProductFeedRebuildResultDto
            {
                Success = true,
                GeneratedAtUtc = feed.LastGeneratedUtc.Value,
                ProductItemCount = productResult.ItemCount,
                PromotionCount = promotionResult.PromotionCount,
                WarningCount = productResult.Warnings.Count + promotionResult.Warnings.Count,
                Warnings = [.. productResult.Warnings, .. promotionResult.Warnings]
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Product feed rebuild failed for feed {FeedId}", id);
            feed.LastGenerationError = ex.Message;
            feed.DateUpdated = DateTime.UtcNow;

            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                await db.SaveChangesAsync(cancellationToken);
                return true;
            });
            scope.Complete();

            return new ProductFeedRebuildResultDto
            {
                Success = false,
                GeneratedAtUtc = DateTime.UtcNow,
                ProductItemCount = 0,
                PromotionCount = 0,
                WarningCount = 0,
                Error = ex.Message
            };
        }
    }

    public async Task<ProductFeedPreviewDto?> PreviewAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var feed = await scope.ExecuteWithContextAsync(async db =>
            await db.Set<ProductFeed>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken));
        scope.Complete();

        if (feed == null)
        {
            return null;
        }

        try
        {
            var productResult = await productFeedGenerator.GenerateAsync(feed, cancellationToken);
            var promotionResult = await promotionFeedGenerator.GenerateAsync(feed, productResult, cancellationToken);

            return new ProductFeedPreviewDto
            {
                ProductItemCount = productResult.ItemCount,
                PromotionCount = promotionResult.PromotionCount,
                Warnings = [.. productResult.Warnings, .. promotionResult.Warnings],
                SampleProductIds = productResult.Items
                    .Take(25)
                    .Select(x => x.ProductId.ToString())
                    .ToList()
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Product feed preview failed for feed {FeedId}", id);
            return new ProductFeedPreviewDto
            {
                Error = ex.Message,
                ProductItemCount = 0,
                PromotionCount = 0,
                Warnings = ["Preview failed"],
                SampleProductIds = []
            };
        }
    }

    public async Task<ProductFeedValidationDto?> ValidateAsync(
        Guid id,
        ValidateProductFeedDto request,
        CancellationToken cancellationToken = default)
    {
        request ??= new ValidateProductFeedDto();

        using var scope = efCoreScopeProvider.CreateScope();
        var feed = await scope.ExecuteWithContextAsync(async db =>
            await db.Set<ProductFeed>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken));
        scope.Complete();

        if (feed == null)
        {
            return null;
        }

        var maxIssues = Math.Clamp(request.MaxIssues ?? 200, 1, 1000);
        var requestedPreviewProductIds = (request.PreviewProductIds ?? [])
            .Where(x => x != Guid.Empty)
            .Distinct()
            .Take(20)
            .Select(x => x.ToString())
            .ToList();

        try
        {
            var productResult = await productFeedGenerator.GenerateAsync(feed, cancellationToken);
            var promotionResult = await promotionFeedGenerator.GenerateAsync(feed, productResult, cancellationToken);

            var warnings = new List<string>();
            warnings.AddRange(productResult.Warnings);
            warnings.AddRange(promotionResult.Warnings);

            var expectedByCountry = GetDefaultIncludeTaxInPrice(feed.CountryCode);
            var actualTaxMode = ResolveIncludeTaxInPrice(feed.CountryCode, feed.IncludeTaxInPrice);
            if (actualTaxMode != expectedByCountry)
            {
                warnings.Add(
                    $"Tax mode differs from Google default for {feed.CountryCode}. " +
                    $"Expected {(expectedByCountry ? "tax-inclusive" : "tax-exclusive")} " +
                    $"but feed is set to {(actualTaxMode ? "tax-inclusive" : "tax-exclusive")}.");
            }

            var issues = new List<ProductFeedValidationIssueDto>();
            XNamespace g = "http://base.google.com/ns/1.0";
            var items = ParseItems(productResult.Xml);

            foreach (var item in items)
            {
                if (issues.Count >= maxIssues)
                {
                    break;
                }

                var productId = GetElementValue(item, g, "id");
                var productName = GetElementValue(item, g, "title");

                ValidateRequiredField(item, g, "id", productId, productName, issues, maxIssues);
                ValidateRequiredField(item, g, "title", productId, productName, issues, maxIssues);
                ValidateRequiredField(item, g, "description", productId, productName, issues, maxIssues);
                ValidateRequiredField(item, g, "link", productId, productName, issues, maxIssues);
                ValidateRequiredField(item, g, "image_link", productId, productName, issues, maxIssues);
                ValidateRequiredField(item, g, "availability", productId, productName, issues, maxIssues);
                ValidateRequiredField(item, g, "price", productId, productName, issues, maxIssues);

                var availability = GetElementValue(item, g, "availability");
                if (!string.IsNullOrWhiteSpace(availability) &&
                    availability is not ("in_stock" or "out_of_stock" or "preorder" or "backorder"))
                {
                    AddIssue(
                        issues,
                        maxIssues,
                        severity: "error",
                        code: "invalid_availability",
                        message: $"Unsupported availability value '{availability}'.",
                        productId: productId,
                        productName: productName,
                        field: "availability");
                }

                var price = GetElementValue(item, g, "price");
                if (!string.IsNullOrWhiteSpace(price) && !IsValidPrice(price))
                {
                    AddIssue(
                        issues,
                        maxIssues,
                        severity: "error",
                        code: "invalid_price_format",
                        message: $"Price '{price}' does not match '<amount> <ISO currency>' format.",
                        productId: productId,
                        productName: productName,
                        field: "price");
                }

                ValidateAbsoluteHttpUrl(item, g, "link", productId, productName, issues, maxIssues);
                ValidateAbsoluteHttpUrl(item, g, "image_link", productId, productName, issues, maxIssues);

                var gtin = GetElementValue(item, g, "gtin");
                var mpn = GetElementValue(item, g, "mpn");
                var identifierExists = GetElementValue(item, g, "identifier_exists");
                if (string.IsNullOrWhiteSpace(gtin) &&
                    string.IsNullOrWhiteSpace(mpn) &&
                    !string.Equals(identifierExists, "no", StringComparison.OrdinalIgnoreCase))
                {
                    AddIssue(
                        issues,
                        maxIssues,
                        severity: "warning",
                        code: "identifier_exists_expected_no",
                        message: "identifier_exists should be 'no' when both gtin and mpn are missing.",
                        productId: productId,
                        productName: productName,
                        field: "identifier_exists");
                }
            }

            var itemsById = items
                .Select(item =>
                {
                    var idValue = GetElementValue(item, g, "id");
                    return new { Item = item, Id = idValue };
                })
                .Where(x => !string.IsNullOrWhiteSpace(x.Id))
                .GroupBy(x => x.Id!, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(x => x.Key, x => x.First().Item, StringComparer.OrdinalIgnoreCase);

            var previews = new List<ProductFeedValidationProductPreviewDto>();
            var missingRequested = new List<string>();
            foreach (var requestedId in requestedPreviewProductIds)
            {
                if (!itemsById.TryGetValue(requestedId, out var item))
                {
                    missingRequested.Add(requestedId);
                    continue;
                }

                previews.Add(MapProductPreview(requestedId, item, g));
            }

            var warningIssueCount = issues.Count(x => string.Equals(x.Severity, "warning", StringComparison.OrdinalIgnoreCase));
            var errorIssueCount = issues.Count(x => string.Equals(x.Severity, "error", StringComparison.OrdinalIgnoreCase));

            return new ProductFeedValidationDto
            {
                ProductItemCount = productResult.ItemCount,
                PromotionCount = promotionResult.PromotionCount,
                WarningCount = warnings.Count + warningIssueCount,
                ErrorCount = errorIssueCount,
                Warnings = warnings,
                Issues = issues,
                SampleProductIds = productResult.Items
                    .Take(25)
                    .Select(x => x.ProductId.ToString())
                    .ToList(),
                ProductPreviews = previews,
                MissingRequestedProductIds = missingRequested
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Product feed validation failed for feed {FeedId}", id);
            return new ProductFeedValidationDto
            {
                ProductItemCount = 0,
                PromotionCount = 0,
                WarningCount = 0,
                ErrorCount = 1,
                Issues =
                [
                    new ProductFeedValidationIssueDto
                    {
                        Severity = "error",
                        Code = "validation_failed",
                        Message = ex.Message
                    }
                ],
                MissingRequestedProductIds = requestedPreviewProductIds
            };
        }
    }

    public async Task<string?> GetProductsXmlAsync(string slug, CancellationToken cancellationToken = default)
    {
        var feed = await GetFeedBySlugAsync(slug, cancellationToken);
        if (feed == null || !feed.IsEnabled)
        {
            return null;
        }

        var cacheKey = BuildCacheKey(feed.Id, "products");
        var cacheTag = BuildCacheTag(feed.Id);

        var xml = await cacheService.GetOrCreateAsync(
            cacheKey,
            async ct => await GenerateProductsWithFallbackAsync(feed.Id, ct),
            ttl: TimeSpan.FromHours(1),
            tags: [cacheTag],
            cancellationToken: cancellationToken);

        return string.IsNullOrWhiteSpace(xml) ? null : xml;
    }

    public async Task<string?> GetPromotionsXmlAsync(string slug, CancellationToken cancellationToken = default)
    {
        var feed = await GetFeedBySlugAsync(slug, cancellationToken);
        if (feed == null || !feed.IsEnabled)
        {
            return null;
        }

        var cacheKey = BuildCacheKey(feed.Id, "promotions");
        var cacheTag = BuildCacheTag(feed.Id);

        var xml = await cacheService.GetOrCreateAsync(
            cacheKey,
            async ct => await GeneratePromotionsWithFallbackAsync(feed.Id, ct),
            ttl: TimeSpan.FromHours(1),
            tags: [cacheTag],
            cancellationToken: cancellationToken);

        return string.IsNullOrWhiteSpace(xml) ? null : xml;
    }

    public Task<List<ProductFeedResolverDescriptorDto>> GetResolversAsync(CancellationToken cancellationToken = default)
    {
        var resolvers = resolverRegistry.GetResolvers()
            .Select(r => new ProductFeedResolverDescriptorDto
            {
                Alias = r.Alias,
                Description = r.Description,
                DisplayName = r is IProductFeedResolverMetadata metadata
                    ? metadata.DisplayName
                    : r.Alias,
                HelpText = (r as IProductFeedResolverMetadata)?.HelpText,
                SupportsArgs = (r as IProductFeedResolverMetadata)?.SupportsArgs ?? false,
                ArgsHelpText = (r as IProductFeedResolverMetadata)?.ArgsHelpText,
                ArgsExampleJson = (r as IProductFeedResolverMetadata)?.ArgsExampleJson
            })
            .OrderBy(r => r.Alias)
            .ToList();

        return Task.FromResult(resolvers);
    }

    private async Task<string> GenerateProductsWithFallbackAsync(Guid feedId, CancellationToken cancellationToken)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var feed = await scope.ExecuteWithContextAsync(async db =>
            await db.Set<ProductFeed>().FirstOrDefaultAsync(x => x.Id == feedId, cancellationToken));

        if (feed == null)
        {
            scope.Complete();
            return string.Empty;
        }

        try
        {
            var productResult = await productFeedGenerator.GenerateAsync(feed, cancellationToken);
            feed.LastSuccessfulProductFeedXml = productResult.Xml;
            feed.LastGeneratedUtc = DateTime.UtcNow;
            feed.LastGenerationError = null;
            feed.DateUpdated = DateTime.UtcNow;

            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                await db.SaveChangesAsync(cancellationToken);
                return true;
            });

            scope.Complete();
            return productResult.Xml;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Product feed generation failed for feed {FeedId}", feedId);
            feed.LastGenerationError = ex.Message;
            feed.DateUpdated = DateTime.UtcNow;

            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                await db.SaveChangesAsync(cancellationToken);
                return true;
            });

            scope.Complete();
            return feed.LastSuccessfulProductFeedXml ?? string.Empty;
        }
    }

    private async Task<string> GeneratePromotionsWithFallbackAsync(Guid feedId, CancellationToken cancellationToken)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var feed = await scope.ExecuteWithContextAsync(async db =>
            await db.Set<ProductFeed>().FirstOrDefaultAsync(x => x.Id == feedId, cancellationToken));

        if (feed == null)
        {
            scope.Complete();
            return string.Empty;
        }

        try
        {
            var productResult = await productFeedGenerator.GenerateAsync(feed, cancellationToken);
            var promotionResult = await promotionFeedGenerator.GenerateAsync(feed, productResult, cancellationToken);

            feed.LastSuccessfulProductFeedXml = productResult.Xml;
            feed.LastSuccessfulPromotionsFeedXml = promotionResult.Xml;
            feed.LastGeneratedUtc = DateTime.UtcNow;
            feed.LastGenerationError = null;
            feed.DateUpdated = DateTime.UtcNow;

            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                await db.SaveChangesAsync(cancellationToken);
                return true;
            });

            scope.Complete();
            return promotionResult.Xml;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Promotion feed generation failed for feed {FeedId}", feedId);
            feed.LastGenerationError = ex.Message;
            feed.DateUpdated = DateTime.UtcNow;

            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                await db.SaveChangesAsync(cancellationToken);
                return true;
            });

            scope.Complete();
            return feed.LastSuccessfulPromotionsFeedXml ?? string.Empty;
        }
    }

    private async Task<ProductFeed?> GetFeedBySlugAsync(string slug, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return null;
        }

        var normalizedSlug = slug.Trim();

        using var scope = efCoreScopeProvider.CreateScope();
        var feed = await scope.ExecuteWithContextAsync(async db =>
            await db.Set<ProductFeed>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Slug == normalizedSlug, cancellationToken));
        scope.Complete();

        return feed;
    }

    private static bool ValidateFeedRequest(
        string name,
        string countryCode,
        string currencyCode,
        string languageCode,
        CrudResult<ProductFeedDetailDto> result)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            result.AddErrorMessage("Feed name is required.");
        }

        if (string.IsNullOrWhiteSpace(countryCode) || countryCode.Trim().Length != 2)
        {
            result.AddErrorMessage("Country code must be a 2-letter ISO code.");
        }

        if (string.IsNullOrWhiteSpace(currencyCode) || currencyCode.Trim().Length != 3)
        {
            result.AddErrorMessage("Currency code must be a 3-letter ISO code.");
        }

        if (string.IsNullOrWhiteSpace(languageCode))
        {
            result.AddErrorMessage("Language code is required.");
        }

        return result.Success;
    }

    private List<ProductFeedCustomFieldDto> NormalizeAndValidateCustomFields(
        List<ProductFeedCustomFieldDto> customFields,
        CrudResult<ProductFeedDetailDto> result)
    {
        List<ProductFeedCustomFieldDto> normalized = [];

        foreach (var field in customFields)
        {
            var normalizedKey = NormalizeCustomAttribute(field.Attribute);
            if (string.IsNullOrWhiteSpace(normalizedKey))
            {
                result.AddErrorMessage("Custom field attribute cannot be empty.");
                continue;
            }

            if (!AllowedCustomAttributes.Contains(normalizedKey))
            {
                result.AddErrorMessage($"Custom field '{normalizedKey}' is not in the Google attribute whitelist.");
                continue;
            }

            normalized.Add(new ProductFeedCustomFieldDto
            {
                Attribute = normalizedKey,
                SourceType = string.IsNullOrWhiteSpace(field.SourceType) ? "static" : field.SourceType.Trim().ToLowerInvariant(),
                StaticValue = field.StaticValue,
                ResolverAlias = field.ResolverAlias,
                Args = field.Args ?? []
            });
        }

        return normalized;
    }

    private static string NormalizeCustomAttribute(string? attribute)
    {
        if (string.IsNullOrWhiteSpace(attribute))
        {
            return string.Empty;
        }

        var normalized = attribute.Trim().ToLowerInvariant();
        normalized = normalized.Replace(" ", "_").Replace("-", "_");
        return normalized;
    }

    private string BuildSlug(string? requestedSlug, string name)
    {
        var candidate = string.IsNullOrWhiteSpace(requestedSlug)
            ? name
            : requestedSlug;

        if (string.IsNullOrWhiteSpace(candidate))
        {
            return string.Empty;
        }

        var slug = slugHelper.GenerateSlug(candidate);
        return TrimSlug(slug, FeedSlugMaxLength);
    }

    private async Task<string?> BuildCreateSlugAsync(
        MerchelloDbContext db,
        string baseSlug,
        CancellationToken cancellationToken)
    {
        var normalizedBaseSlug = TrimSlug(baseSlug, FeedSlugMaxLength - FeedSlugPrefixLength - 1);
        if (string.IsNullOrWhiteSpace(normalizedBaseSlug))
        {
            return null;
        }

        for (var attempt = 0; attempt < FeedSlugCreateMaxAttempts; attempt++)
        {
            var candidate = $"{GenerateSlugPrefix()}-{normalizedBaseSlug}";
            var exists = await db.Set<ProductFeed>()
                .AnyAsync(x => x.Slug == candidate, cancellationToken);
            if (!exists)
            {
                return candidate;
            }
        }

        return null;
    }

    private static string GenerateSlugPrefix()
    {
        Span<byte> bytes = stackalloc byte[FeedSlugPrefixLength];
        RandomNumberGenerator.Fill(bytes);

        Span<char> chars = stackalloc char[FeedSlugPrefixLength];
        for (var i = 0; i < chars.Length; i++)
        {
            chars[i] = SlugPrefixAlphabet[bytes[i] % SlugPrefixAlphabet.Length];
        }

        return new string(chars);
    }

    private static string TrimSlug(string? slug, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(slug) || maxLength <= 0)
        {
            return string.Empty;
        }

        var normalized = slug.Trim();
        return normalized.Length <= maxLength
            ? normalized
            : normalized[..maxLength];
    }

    private async Task InvalidateFeedCacheAsync(Guid feedId, CancellationToken cancellationToken)
    {
        await cacheService.RemoveByTagAsync(BuildCacheTag(feedId), cancellationToken);
    }

    private static string BuildCacheTag(Guid feedId) => $"{FeedCacheTagPrefix}{feedId}";

    private static string BuildCacheKey(Guid feedId, string endpoint) => $"{FeedCacheKeyPrefix}{feedId}:{endpoint}";

    private static ProductFeedListItemDto MapToListItemDto(ProductFeed feed)
    {
        return new ProductFeedListItemDto
        {
            Id = feed.Id,
            Name = feed.Name,
            Slug = feed.Slug,
            IsEnabled = feed.IsEnabled,
            CountryCode = feed.CountryCode,
            CurrencyCode = feed.CurrencyCode,
            LanguageCode = feed.LanguageCode,
            IncludeTaxInPrice = ResolveIncludeTaxInPrice(feed.CountryCode, feed.IncludeTaxInPrice),
            LastGeneratedUtc = feed.LastGeneratedUtc,
            HasProductSnapshot = !string.IsNullOrWhiteSpace(feed.LastSuccessfulProductFeedXml),
            HasPromotionsSnapshot = !string.IsNullOrWhiteSpace(feed.LastSuccessfulPromotionsFeedXml),
            LastGenerationError = feed.LastGenerationError
        };
    }

    private static ProductFeedDetailDto MapToDetailDto(ProductFeed feed)
    {
        return new ProductFeedDetailDto
        {
            Id = feed.Id,
            Name = feed.Name,
            Slug = feed.Slug,
            IsEnabled = feed.IsEnabled,
            CountryCode = feed.CountryCode,
            CurrencyCode = feed.CurrencyCode,
            LanguageCode = feed.LanguageCode,
            IncludeTaxInPrice = ResolveIncludeTaxInPrice(feed.CountryCode, feed.IncludeTaxInPrice),
            FilterConfig = MapFilterConfigDto(Deserialize(feed.FilterConfigJson, new ProductFeedFilterConfig())),
            CustomLabels = MapCustomLabelDtos(Deserialize(feed.CustomLabelsJson, new List<ProductFeedCustomLabelConfig>())),
            CustomFields = MapCustomFieldDtos(Deserialize(feed.CustomFieldsJson, new List<ProductFeedCustomFieldConfig>())),
            ManualPromotions = MapManualPromotionDtos(Deserialize(feed.ManualPromotionsJson, new List<ProductFeedManualPromotion>())),
            LastGeneratedUtc = feed.LastGeneratedUtc,
            LastGenerationError = feed.LastGenerationError,
            HasProductSnapshot = !string.IsNullOrWhiteSpace(feed.LastSuccessfulProductFeedXml),
            HasPromotionsSnapshot = !string.IsNullOrWhiteSpace(feed.LastSuccessfulPromotionsFeedXml)
        };
    }

    private static T Deserialize<T>(string? json, T fallback)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return fallback;
        }

        try
        {
            return JsonSerializer.Deserialize<T>(json, JsonOptions) ?? fallback;
        }
        catch (JsonException)
        {
            return fallback;
        }
    }

    private static bool GetDefaultIncludeTaxInPrice(string? countryCode)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return true;
        }

        var normalized = countryCode.Trim().ToUpperInvariant();
        return normalized is not ("US" or "CA");
    }

    private static bool ResolveIncludeTaxInPrice(string? countryCode, bool? includeTaxInPrice)
    {
        return includeTaxInPrice ?? GetDefaultIncludeTaxInPrice(countryCode);
    }

    private static List<XElement> ParseItems(string xml)
    {
        if (string.IsNullOrWhiteSpace(xml))
        {
            return [];
        }

        try
        {
            var document = XDocument.Parse(xml);
            return document.Descendants("item").ToList();
        }
        catch (Exception)
        {
            return [];
        }
    }

    private static string? GetElementValue(XElement item, XNamespace g, string name)
    {
        return item.Element(g + name)?.Value?.Trim();
    }

    private static void ValidateRequiredField(
        XElement item,
        XNamespace g,
        string field,
        string? productId,
        string? productName,
        List<ProductFeedValidationIssueDto> issues,
        int maxIssues)
    {
        if (!string.IsNullOrWhiteSpace(GetElementValue(item, g, field)))
        {
            return;
        }

        AddIssue(
            issues,
            maxIssues,
            severity: "error",
            code: "missing_required_field",
            message: $"Required field '{field}' is missing.",
            productId: productId,
            productName: productName,
            field: field);
    }

    private static void ValidateAbsoluteHttpUrl(
        XElement item,
        XNamespace g,
        string field,
        string? productId,
        string? productName,
        List<ProductFeedValidationIssueDto> issues,
        int maxIssues)
    {
        var value = GetElementValue(item, g, field);
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        if (Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
            (string.Equals(uri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase) ||
             string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        AddIssue(
            issues,
            maxIssues,
            severity: "error",
            code: "invalid_url",
            message: $"Field '{field}' must be an absolute http/https URL.",
            productId: productId,
            productName: productName,
            field: field);
    }

    private static bool IsValidPrice(string value)
    {
        var parts = value.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 2)
        {
            return false;
        }

        if (!decimal.TryParse(parts[0], NumberStyles.Number, CultureInfo.InvariantCulture, out _))
        {
            return false;
        }

        if (parts[1].Length != 3 || parts[1].Any(c => !char.IsLetter(c)))
        {
            return false;
        }

        return string.Equals(parts[1], parts[1].ToUpperInvariant(), StringComparison.Ordinal);
    }

    private static void AddIssue(
        List<ProductFeedValidationIssueDto> issues,
        int maxIssues,
        string severity,
        string code,
        string message,
        string? productId = null,
        string? productName = null,
        string? field = null)
    {
        if (issues.Count >= maxIssues)
        {
            return;
        }

        issues.Add(new ProductFeedValidationIssueDto
        {
            Severity = severity,
            Code = code,
            Message = message,
            ProductId = productId,
            ProductName = productName,
            Field = field
        });
    }

    private static ProductFeedValidationProductPreviewDto MapProductPreview(string productId, XElement item, XNamespace g)
    {
        var fields = item.Elements()
            .Select(element => new ProductFeedValidationPreviewFieldDto
            {
                Field = element.Name.LocalName,
                Value = element.Value.Trim()
            })
            .ToList();

        return new ProductFeedValidationProductPreviewDto
        {
            ProductId = productId,
            ProductName = GetElementValue(item, g, "title"),
            Title = GetElementValue(item, g, "title"),
            Price = GetElementValue(item, g, "price"),
            Availability = GetElementValue(item, g, "availability"),
            Link = GetElementValue(item, g, "link"),
            ImageLink = GetElementValue(item, g, "image_link"),
            Brand = GetElementValue(item, g, "brand"),
            Gtin = GetElementValue(item, g, "gtin"),
            Mpn = GetElementValue(item, g, "mpn"),
            IdentifierExists = GetElementValue(item, g, "identifier_exists"),
            ShippingLabel = GetElementValue(item, g, "shipping_label"),
            Fields = fields
        };
    }

    private static ProductFeedFilterConfig MapFilterConfig(ProductFeedFilterConfigDto? dto)
    {
        if (dto == null)
        {
            return new ProductFeedFilterConfig();
        }

        var groupedFilters = (dto.FilterValueGroups ?? [])
            .Where(g => g.FilterGroupId != Guid.Empty)
            .GroupBy(g => g.FilterGroupId)
            .Select(g => new ProductFeedFilterValueGroup
            {
                FilterGroupId = g.Key,
                FilterIds = g
                    .SelectMany(x => x.FilterIds ?? [])
                    .Where(id => id != Guid.Empty)
                    .Distinct()
                    .ToList()
            })
            .Where(g => g.FilterIds.Count > 0)
            .ToList();

        return new ProductFeedFilterConfig
        {
            ProductTypeIds = (dto.ProductTypeIds ?? []).Where(id => id != Guid.Empty).Distinct().ToList(),
            CollectionIds = (dto.CollectionIds ?? []).Where(id => id != Guid.Empty).Distinct().ToList(),
            FilterValueGroups = groupedFilters
        };
    }

    private static List<ProductFeedCustomLabelConfig> MapCustomLabels(List<ProductFeedCustomLabelDto> labels)
    {
        return labels
            .Where(l => l.Slot >= 0 && l.Slot <= 4)
            .GroupBy(l => l.Slot)
            .Select(g => g.First())
            .Select(l => new ProductFeedCustomLabelConfig
            {
                Slot = l.Slot,
                SourceType = string.IsNullOrWhiteSpace(l.SourceType) ? "static" : l.SourceType.Trim().ToLowerInvariant(),
                StaticValue = l.StaticValue,
                ResolverAlias = l.ResolverAlias,
                Args = l.Args ?? []
            })
            .OrderBy(l => l.Slot)
            .ToList();
    }

    private static List<ProductFeedCustomFieldConfig> MapCustomFields(List<ProductFeedCustomFieldDto> fields)
    {
        return fields
            .Select(f => new ProductFeedCustomFieldConfig
            {
                Attribute = NormalizeCustomAttribute(f.Attribute),
                SourceType = string.IsNullOrWhiteSpace(f.SourceType) ? "static" : f.SourceType.Trim().ToLowerInvariant(),
                StaticValue = f.StaticValue,
                ResolverAlias = f.ResolverAlias,
                Args = f.Args ?? []
            })
            .ToList();
    }

    private static List<ProductFeedManualPromotion> MapManualPromotions(List<ProductFeedManualPromotionDto> promotions)
    {
        return promotions
            .Where(p => !string.IsNullOrWhiteSpace(p.PromotionId) && !string.IsNullOrWhiteSpace(p.Name))
            .Select(p => new ProductFeedManualPromotion
            {
                PromotionId = p.PromotionId.Trim(),
                Name = p.Name.Trim(),
                RequiresCouponCode = p.RequiresCouponCode,
                CouponCode = p.CouponCode,
                Description = p.Description,
                StartsAtUtc = p.StartsAtUtc,
                EndsAtUtc = p.EndsAtUtc,
                Priority = p.Priority,
                PercentOff = p.PercentOff,
                AmountOff = p.AmountOff,
                FilterConfig = MapFilterConfig(p.FilterConfig ?? new ProductFeedFilterConfigDto())
            })
            .ToList();
    }

    private static ProductFeedFilterConfigDto MapFilterConfigDto(ProductFeedFilterConfig? model)
    {
        if (model == null)
        {
            return new ProductFeedFilterConfigDto();
        }

        return new ProductFeedFilterConfigDto
        {
            ProductTypeIds = model.ProductTypeIds ?? [],
            CollectionIds = model.CollectionIds ?? [],
            FilterValueGroups = (model.FilterValueGroups ?? [])
                .Select(g => new ProductFeedFilterValueGroupDto
                {
                    FilterGroupId = g.FilterGroupId,
                    FilterIds = g.FilterIds ?? []
                })
                .ToList()
        };
    }

    private static List<ProductFeedCustomLabelDto> MapCustomLabelDtos(List<ProductFeedCustomLabelConfig> models)
    {
        return models
            .Select(m => new ProductFeedCustomLabelDto
            {
                Slot = m.Slot,
                SourceType = m.SourceType,
                StaticValue = m.StaticValue,
                ResolverAlias = m.ResolverAlias,
                Args = m.Args ?? []
            })
            .ToList();
    }

    private static List<ProductFeedCustomFieldDto> MapCustomFieldDtos(List<ProductFeedCustomFieldConfig> models)
    {
        return models
            .Select(m => new ProductFeedCustomFieldDto
            {
                Attribute = m.Attribute,
                SourceType = m.SourceType,
                StaticValue = m.StaticValue,
                ResolverAlias = m.ResolverAlias,
                Args = m.Args ?? []
            })
            .ToList();
    }

    private static List<ProductFeedManualPromotionDto> MapManualPromotionDtos(List<ProductFeedManualPromotion> models)
    {
        return models
            .Select(m => new ProductFeedManualPromotionDto
            {
                PromotionId = m.PromotionId,
                Name = m.Name,
                RequiresCouponCode = m.RequiresCouponCode,
                CouponCode = m.CouponCode,
                Description = m.Description,
                StartsAtUtc = m.StartsAtUtc,
                EndsAtUtc = m.EndsAtUtc,
                Priority = m.Priority,
                PercentOff = m.PercentOff,
                AmountOff = m.AmountOff,
                FilterConfig = MapFilterConfigDto(m.FilterConfig)
            })
            .ToList();
    }
}
