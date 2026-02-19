using Merchello.Core;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Products.Extensions;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Models;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

// ReSharper disable ConditionIsAlwaysTrueOrFalseAccordingToNullableReferenceTypes

namespace Merchello.Core.Upsells.Services;

/// <summary>
/// Core evaluation engine: loads active rules, matches triggers, fetches recommendation products,
/// applies filter matching, region filtering, and deduplication.
/// </summary>
public class UpsellEngine(
    IUpsellService upsellService,
    IProductService productService,
    IInvoiceService invoiceService,
    IUpsellContextBuilder upsellContextBuilder,
    ICurrencyService currencyService,
    ITaxService taxService,
    IOptions<MerchelloSettings> merchelloSettings,
    IOptions<UpsellSettings> upsellSettings,
    ILogger<UpsellEngine> logger,
    IMerchelloStoreSettingsService? storeSettingsService = null) : IUpsellEngine
{
    private readonly UpsellSettings _settings = upsellSettings.Value;
    private readonly MerchelloSettings _storeSettings = merchelloSettings.Value;
    private readonly IMerchelloStoreSettingsService? _storeSettingsService = storeSettingsService;

    /// <inheritdoc />
    public async Task<List<UpsellSuggestion>> GetSuggestionsAsync(UpsellContext context, CancellationToken ct = default)
    {
        if (context.LineItems.Count == 0)
            return [];

        var location = context.Location ?? UpsellDisplayLocation.All;
        var activeRules = await upsellService.GetActiveUpsellRulesForLocationAsync(location, ct);

        if (activeRules.Count == 0)
            return [];

        return await EvaluateRulesAsync(activeRules, context, ct);
    }

    /// <inheritdoc />
    public async Task<List<UpsellSuggestion>> GetSuggestionsForLocationAsync(
        UpsellContext context,
        UpsellDisplayLocation location,
        CancellationToken ct = default)
    {
        if (context.LineItems.Count == 0)
            return [];

        context.Location = location;
        var activeRules = await upsellService.GetActiveUpsellRulesForLocationAsync(location, ct);

        if (activeRules.Count == 0)
            return [];

        return await EvaluateRulesAsync(activeRules, context, ct);
    }

    /// <inheritdoc />
    public async Task<List<UpsellSuggestion>> GetSuggestionsForInvoiceAsync(Guid invoiceId, CancellationToken ct = default)
    {
        var invoice = await invoiceService.GetInvoiceAsync(invoiceId, ct);
        if (invoice == null)
            return [];

        var orderLineItems = invoice.Orders?
            .SelectMany(o => o.LineItems ?? [])
            .Where(li => li.ProductId.HasValue)
            .ToList() ?? [];

        if (orderLineItems.Count == 0)
            return [];

        var lineItems = await upsellContextBuilder.BuildLineItemsAsync(orderLineItems, ct);
        if (lineItems.Count == 0)
            return [];

        var context = new UpsellContext
        {
            CustomerId = invoice.CustomerId,
            LineItems = lineItems,
            CountryCode = invoice.ShippingAddress?.CountryCode,
            RegionCode = invoice.ShippingAddress?.CountyState?.RegionCode,
            Location = UpsellDisplayLocation.Email,
            DisplayContext = BuildInvoiceDisplayContext(invoice)
        };

        var activeRules = await upsellService.GetActiveUpsellRulesForLocationAsync(UpsellDisplayLocation.Email, ct);
        if (activeRules.Count == 0)
            return [];

        return await EvaluateRulesAsync(activeRules, context, ct);
    }

    /// <inheritdoc />
    public async Task<List<UpsellSuggestion>> GetSuggestionsForProductAsync(Guid productId, CancellationToken ct = default)
    {
        var syntheticLineItem = await upsellContextBuilder.BuildLineItemAsync(
            productId,
            1,
            0m,
            ct);
        if (syntheticLineItem == null)
            return [];

        var context = new UpsellContext
        {
            LineItems = [syntheticLineItem],
            Location = UpsellDisplayLocation.ProductPage
        };

        var activeRules = await upsellService.GetActiveUpsellRulesForLocationAsync(UpsellDisplayLocation.ProductPage, ct);
        if (activeRules.Count == 0)
            return [];

        return await EvaluateRulesAsync(activeRules, context, ct);
    }

    // =====================================================
    // Core Evaluation Pipeline
    // =====================================================

    private async Task<List<UpsellSuggestion>> EvaluateRulesAsync(
        List<UpsellRule> rules,
        UpsellContext context,
        CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var suggestions = new List<UpsellSuggestion>();
        var displayContext = ResolveDisplayContext(context);
        var useAbsoluteUrls = context.Location == UpsellDisplayLocation.Email;

        // Step 1: Filter by schedule and eligibility
        var eligibleRules = rules
            .Where(r => IsWithinSchedule(r, now))
            .Where(r => IsEligible(r, context))
            .ToList();

        if (eligibleRules.Count == 0)
            return [];

        // Step 2: Trigger matching — collect matched rules with their matching line items
        var matchedRules = new List<(UpsellRule Rule, List<UpsellContextLineItem> MatchingLineItems, Dictionary<Guid, HashSet<Guid>> ExtractedFilters)>();

        foreach (var rule in eligibleRules)
        {
            var triggerRules = rule.TriggerRules;
            if (triggerRules.Count == 0) continue;

            if (!UpsellTriggerMatcher.DoesBasketMatchTriggerRules(context.LineItems, triggerRules))
                continue;

            var matchingLineItems = UpsellTriggerMatcher.GetMatchingLineItems(context.LineItems, triggerRules);
            var extractedFilters = UpsellTriggerMatcher.ExtractFilterValues(matchingLineItems, triggerRules);

            matchedRules.Add((rule, matchingLineItems, extractedFilters));
        }

        if (matchedRules.Count == 0)
            return [];

        // Step 3: Batch product fetching — group recommendation criteria by type
        var allRecommendationCriteria = CollectRecommendationCriteria(matchedRules);
        var includeProductFilters = matchedRules.Any(m =>
            m.Rule.RecommendationRules.Any(r =>
                r.RecommendationType == UpsellRecommendationType.ProductFilters ||
                r.MatchTriggerFilters));
        var includeWarehouses = context.CountryCode != null ||
            matchedRules.Any(m => m.Rule.RecommendationRules.Any(r =>
                r.RecommendationType == UpsellRecommendationType.Suppliers));
        var includeRootWarehouses = includeWarehouses;
        var includeVariants = context.Location != UpsellDisplayLocation.Email;

        var productsByType = allRecommendationCriteria.Count == 0
            ? new Dictionary<UpsellRecommendationType, List<Product>>()
            : await BatchFetchRecommendationProductsAsync(
                allRecommendationCriteria,
                includeProductFilters,
                includeWarehouses,
                includeRootWarehouses,
                includeVariants,
                ct);

        // Step 4: Per-rule product filtering, deduplication, sorting, and truncation
        var basketProductIds = context.LineItems.Select(li => li.ProductId).ToHashSet();
        var basketProductRootIds = context.LineItems.Select(li => li.ProductRootId).ToHashSet();

        foreach (var (rule, matchingLineItems, extractedFilters) in matchedRules)
        {
            if (rule.RecommendationRules.Count == 0)
            {
                suggestions.Add(new UpsellSuggestion
                {
                    UpsellRuleId = rule.Id,
                    Heading = rule.Heading,
                    Message = rule.Message,
                    Priority = rule.Priority,
                    CheckoutMode = rule.CheckoutMode,
                    DefaultChecked = rule.DefaultChecked,
                    DisplayStyles = rule.DisplayStyles,
                    Products = []
                });
                continue;
            }

            var candidateProducts = GetCandidateProductsForRule(rule, productsByType);

            // Deduplicate by ProductRootId within this rule
            var seenRoots = new HashSet<Guid>();
            candidateProducts = candidateProducts
                .Where(p => seenRoots.Add(p.ProductRootId))
                .ToList();

            // Apply filter matching
            if (extractedFilters.Count > 0)
            {
                candidateProducts = ApplyFilterMatching(candidateProducts, rule, extractedFilters);
            }

            // Region filtering
            if (context.CountryCode != null)
            {
                candidateProducts = candidateProducts
                    .Where(p => CanServeRegion(p, context.CountryCode, context.RegionCode))
                    .ToList();
            }

            // Suppress if in cart
            if (rule.SuppressIfInCart)
            {
                candidateProducts = candidateProducts
                    .Where(p => !basketProductIds.Contains(p.Id) && !basketProductRootIds.Contains(p.ProductRootId))
                    .ToList();
            }

            // Remove unavailable products
            candidateProducts = candidateProducts
                .Where(p => p.AvailableForPurchase && p.CanPurchase)
                .ToList();

            if (candidateProducts.Count == 0)
                continue;

            // Sort
            candidateProducts = SortProducts(candidateProducts, rule.SortBy);

            // Take MaxProducts
            candidateProducts = candidateProducts.Take(rule.MaxProducts).ToList();

            // Build suggestion
            var mappedProducts = new List<UpsellProduct>();
            foreach (var p in candidateProducts)
            {
                mappedProducts.Add(await MapToUpsellProductAsync(p, displayContext, useAbsoluteUrls, ct));
            }

            suggestions.Add(new UpsellSuggestion
            {
                UpsellRuleId = rule.Id,
                Heading = rule.Heading,
                Message = rule.Message,
                Priority = rule.Priority,
                CheckoutMode = rule.CheckoutMode,
                DefaultChecked = rule.DefaultChecked,
                DisplayStyles = rule.DisplayStyles,
                Products = mappedProducts.ToList()
            });
        }

        // Step 5: Sort by priority and apply global cap
        return suggestions
            .OrderBy(s => s.Priority)
            .Take(_settings.MaxSuggestionsPerLocation)
            .ToList();
    }

    // =====================================================
    // Schedule & Eligibility
    // =====================================================

    private static bool IsWithinSchedule(UpsellRule rule, DateTime now)
    {
        if (rule.StartsAt > now) return false;
        if (rule.EndsAt.HasValue && rule.EndsAt.Value <= now) return false;
        return true;
    }

    private static bool IsEligible(UpsellRule rule, UpsellContext context)
    {
        var eligibilityRules = rule.EligibilityRules;
        if (eligibilityRules.Count == 0) return true;

        foreach (var eligibility in eligibilityRules)
        {
            if (eligibility.EligibilityType == UpsellEligibilityType.AllCustomers)
                return true;

            var eligibilityIds = eligibility.GetEligibilityIdsList();
            if (eligibilityIds.Count == 0) continue;

            if (eligibility.EligibilityType == UpsellEligibilityType.CustomerSegments
                && context.CustomerSegmentIds != null)
            {
                if (eligibilityIds.Any(id => context.CustomerSegmentIds.Contains(id)))
                    return true;
            }

            if (eligibility.EligibilityType == UpsellEligibilityType.SpecificCustomers
                && context.CustomerId.HasValue)
            {
                if (eligibilityIds.Contains(context.CustomerId.Value))
                    return true;
            }
        }

        return false;
    }

    // =====================================================
    // Batch Product Fetching
    // =====================================================

    private static List<RecommendationCriteria> CollectRecommendationCriteria(
        List<(UpsellRule Rule, List<UpsellContextLineItem> MatchingLineItems, Dictionary<Guid, HashSet<Guid>> ExtractedFilters)> matchedRules)
    {
        var criteriaByType = new Dictionary<UpsellRecommendationType, RecommendationCriteriaBuilder>();

        foreach (var (rule, _, _) in matchedRules)
        {
            foreach (var recRule in rule.RecommendationRules)
            {
                var ids = recRule.GetRecommendationIdsList();
                if (ids.Count == 0) continue;

                if (!criteriaByType.TryGetValue(recRule.RecommendationType, out var builder))
                {
                    builder = new RecommendationCriteriaBuilder();
                    criteriaByType[recRule.RecommendationType] = builder;
                }

                foreach (var id in ids)
                    builder.Ids.Add(id);

                if (rule.SortBy == UpsellSortBy.BestSeller)
                    builder.RequiresPopularity = true;
            }
        }

        return criteriaByType
            .Select(kvp => new RecommendationCriteria(kvp.Key, kvp.Value.Ids.ToList(), kvp.Value.RequiresPopularity))
            .ToList();
    }

    private async Task<Dictionary<UpsellRecommendationType, List<Product>>> BatchFetchRecommendationProductsAsync(
        List<RecommendationCriteria> criteria,
        bool includeProductFilters,
        bool includeWarehouses,
        bool includeRootWarehouses,
        bool includeVariants,
        CancellationToken ct)
    {
        var result = new Dictionary<UpsellRecommendationType, List<Product>>();

        foreach (var c in criteria)
        {
            var queryParams = BuildProductQueryForRecommendationType(
                c,
                includeProductFilters,
                includeWarehouses,
                includeRootWarehouses,
                includeVariants);
            if (queryParams == null) continue;

            try
            {
                var products = await productService.QueryProducts(queryParams, ct);
                result[c.Type] = products.Items.ToList();
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to fetch recommendation products for type {Type}", c.Type);
                result[c.Type] = [];
            }
        }

        return result;
    }

    private static ProductQueryParameters? BuildProductQueryForRecommendationType(
        RecommendationCriteria criteria,
        bool includeProductFilters,
        bool includeWarehouses,
        bool includeRootWarehouses,
        bool includeVariants)
    {
        if (criteria.Ids.Count == 0)
        {
            return null;
        }

        var baseParams = new ProductQueryParameters
        {
            AmountPerPage = 200,
            AvailabilityFilter = ProductAvailabilityFilter.Available,
            IncludeProductWarehouses = includeWarehouses,
            IncludeProductRootWarehouses = includeRootWarehouses,
            IncludeProductFilters = includeProductFilters,
            IncludeSiblingVariants = includeVariants,
            NoTracking = true,
            OrderBy = criteria.RequiresPopularity ? ProductOrderBy.Popularity : ProductOrderBy.PriceAsc
        };

        switch (criteria.Type)
        {
            case UpsellRecommendationType.ProductTypes:
                baseParams.ProductTypeKeys = criteria.Ids;
                return baseParams;

            case UpsellRecommendationType.ProductFilters:
                baseParams.FilterKeys = criteria.Ids;
                return baseParams;

            case UpsellRecommendationType.Collections:
                baseParams.CollectionIds = criteria.Ids;
                return baseParams;

            case UpsellRecommendationType.SpecificProducts:
                baseParams.ProductIds = criteria.Ids;
                baseParams.ProductRootKeys = criteria.Ids;
                baseParams.AllVariants = true;
                return baseParams;

            case UpsellRecommendationType.Suppliers:
                baseParams.SupplierIds = criteria.Ids;
                return baseParams;

            default:
                return null;
        }
    }

    private static List<Product> GetCandidateProductsForRule(
        UpsellRule rule,
        Dictionary<UpsellRecommendationType, List<Product>> productsByType)
    {
        var candidates = new List<Product>();

        foreach (var recRule in rule.RecommendationRules)
        {
            if (!productsByType.TryGetValue(recRule.RecommendationType, out var products))
                continue;

            var recIds = recRule.GetRecommendationIdsList();
            if (recIds.Count == 0)
            {
                candidates.AddRange(products);
                continue;
            }

            var recIdSet = recIds.ToHashSet();

            var filtered = recRule.RecommendationType switch
            {
                UpsellRecommendationType.ProductTypes =>
                    products.Where(p => recIdSet.Contains(p.ProductRoot?.ProductTypeId ?? Guid.Empty)),
                UpsellRecommendationType.ProductFilters =>
                    products.Where(p => p.Filters.Any(f => recIdSet.Contains(f.Id))),
                UpsellRecommendationType.Collections =>
                    products.Where(p => p.ProductRoot?.Collections?.Any(c => recIdSet.Contains(c.Id)) == true),
                UpsellRecommendationType.SpecificProducts =>
                    products.Where(p => recIdSet.Contains(p.Id) || recIdSet.Contains(p.ProductRootId)),
                UpsellRecommendationType.Suppliers =>
                    products.Where(p =>
                        p.ProductRoot?.ProductRootWarehouses?.Any(prw =>
                            prw.Warehouse != null &&
                            prw.Warehouse.SupplierId.HasValue &&
                            recIdSet.Contains(prw.Warehouse.SupplierId.Value)) == true ||
                        p.ProductWarehouses?.Any(pw =>
                            pw.Warehouse != null &&
                            pw.Warehouse.SupplierId.HasValue &&
                            recIdSet.Contains(pw.Warehouse.SupplierId.Value)) == true),
                _ => Enumerable.Empty<Product>()
            };

            candidates.AddRange(filtered);
        }

        return candidates;
    }

    // =====================================================
    // Filter Matching
    // =====================================================

    private static List<Product> ApplyFilterMatching(
        List<Product> candidates,
        UpsellRule rule,
        Dictionary<Guid, HashSet<Guid>> extractedFilters)
    {
        var matchingRecRules = rule.RecommendationRules
            .Where(r => r.MatchTriggerFilters)
            .ToList();

        if (matchingRecRules.Count == 0)
            return candidates;

        return candidates.Where(product =>
        {
            foreach (var recRule in matchingRecRules)
            {
                var matchFilterIds = recRule.GetMatchFilterIdsList();
                var matchFilterIdSet = matchFilterIds.Count > 0 ? matchFilterIds.ToHashSet() : null;

                // Filter extracted values to only include specified filter IDs (if any)
                var groupsToCheck = matchFilterIdSet != null
                    ? extractedFilters
                        .Select(kvp => (kvp.Key, FilterIds: kvp.Value.Where(fid => matchFilterIdSet.Contains(fid)).ToHashSet()))
                        .Where(x => x.FilterIds.Count > 0)
                    : extractedFilters.Select(kvp => (kvp.Key, FilterIds: kvp.Value));

                foreach (var (filterGroupId, requiredFilterIds) in groupsToCheck)
                {
                    var productFiltersInGroup = product.Filters
                        .Where(f => f.ProductFilterGroupId == filterGroupId)
                        .Select(f => f.Id)
                        .ToHashSet();

                    if (!requiredFilterIds.Any(fid => productFiltersInGroup.Contains(fid)))
                        return false;
                }
            }

            return true;
        }).ToList();
    }

    // =====================================================
    // Region Filtering
    // =====================================================

    private static bool CanServeRegion(Product product, string countryCode, string? regionCode)
    {
        var warehouses = (product.ProductWarehouses ?? [])
            .Select(pw => pw.Warehouse)
            .Concat(product.ProductRoot?.ProductRootWarehouses?.Select(prw => prw.Warehouse) ?? [])
            .Where(w => w != null)
            .ToList();

        if (warehouses.Count == 0)
            return true;

        return warehouses.Any(w => w!.CanServeRegion(countryCode, regionCode));
    }

    // =====================================================
    // Sorting
    // =====================================================

    private static List<Product> SortProducts(List<Product> products, UpsellSortBy sortBy)
    {
        return sortBy switch
        {
            UpsellSortBy.PriceLowToHigh => products.OrderBy(p => p.Price).ToList(),
            UpsellSortBy.PriceHighToLow => products.OrderByDescending(p => p.Price).ToList(),
            UpsellSortBy.Name => products.OrderBy(p => p.Name).ToList(),
            UpsellSortBy.DateAdded => products.OrderByDescending(p => p.DateCreated).ToList(),
            UpsellSortBy.Random => products.OrderBy(_ => Random.Shared.Next()).ToList(),
            _ => products // BestSeller uses the order from the query (Popularity sort)
        };
    }

    // =====================================================
    // Display Context
    // =====================================================

    private StorefrontDisplayContext ResolveDisplayContext(UpsellContext context)
    {
        if (context.DisplayContext != null)
        {
            return context.DisplayContext;
        }

        var effectiveStoreSettings = GetEffectiveStoreSettings();
        var currencyCode = effectiveStoreSettings.StoreCurrencyCode;
        var currencyInfo = currencyService.GetCurrency(currencyCode);
        var countryCode = context.CountryCode
            ?? effectiveStoreSettings.DefaultShippingCountry
            ?? "US";

        return new StorefrontDisplayContext(
            currencyInfo.Code,
            currencyInfo.Symbol,
            currencyInfo.DecimalPlaces,
            1m,
            effectiveStoreSettings.StoreCurrencyCode,
            effectiveStoreSettings.DisplayPricesIncTax,
            countryCode,
            context.RegionCode);
    }

    private StorefrontDisplayContext BuildInvoiceDisplayContext(Invoice invoice)
    {
        var effectiveStoreSettings = GetEffectiveStoreSettings();
        var storeCurrencyCode = string.IsNullOrWhiteSpace(invoice.StoreCurrencyCode)
            ? effectiveStoreSettings.StoreCurrencyCode
            : invoice.StoreCurrencyCode;

        var currencyCode = string.IsNullOrWhiteSpace(invoice.CurrencyCode)
            ? storeCurrencyCode
            : invoice.CurrencyCode;

        var currencyInfo = currencyService.GetCurrency(currencyCode);
        var currencySymbol = string.IsNullOrWhiteSpace(invoice.CurrencySymbol)
            ? currencyInfo.Symbol
            : invoice.CurrencySymbol;

        var exchangeRate = 1m;
        if (!string.Equals(currencyCode, storeCurrencyCode, StringComparison.OrdinalIgnoreCase))
        {
            if (invoice.PricingExchangeRate.HasValue && invoice.PricingExchangeRate.Value > 0m)
            {
                exchangeRate = 1m / invoice.PricingExchangeRate.Value;
            }
        }

        var taxCountryCode = invoice.ShippingAddress?.CountryCode
            ?? invoice.BillingAddress?.CountryCode
            ?? effectiveStoreSettings.DefaultShippingCountry
            ?? "US";

        return new StorefrontDisplayContext(
            currencyCode,
            currencySymbol,
            currencyInfo.DecimalPlaces,
            exchangeRate,
            storeCurrencyCode,
            effectiveStoreSettings.DisplayPricesIncTax,
            taxCountryCode,
            invoice.ShippingAddress?.CountyState?.RegionCode);
    }

    // =====================================================
    // Mapping
    // =====================================================

    private async Task<UpsellProduct> MapToUpsellProductAsync(
        Product product,
        StorefrontDisplayContext displayContext,
        bool useAbsoluteUrls,
        CancellationToken ct)
    {
        var displayPrice = await product.GetDisplayPriceAsync(displayContext, taxService, currencyService, ct);
        var formattedPrice = currencyService.FormatWithSymbol(
            displayPrice.Amount,
            displayPrice.CurrencySymbol,
            displayPrice.DecimalPlaces);
        var formattedPreviousPrice = displayPrice.CompareAtAmount.HasValue
            ? currencyService.FormatWithSymbol(
                displayPrice.CompareAtAmount.Value,
                displayPrice.CurrencySymbol,
                displayPrice.DecimalPlaces)
            : null;
        var formattedTaxAmount = displayPrice.IncludesTax && displayPrice.TaxAmount > 0
            ? currencyService.FormatWithSymbol(
                displayPrice.TaxAmount,
                displayPrice.CurrencySymbol,
                displayPrice.DecimalPlaces)
            : null;

        var images = BuildProductImages(product, useAbsoluteUrls);
        var url = BuildProductUrl(product);
        if (useAbsoluteUrls)
        {
            url = BuildAbsoluteUrl(url);
        }

        var variants = await BuildVariantsAsync(product, displayContext, ct);
        var hasVariants = variants != null && variants.Count > 0 && (product.ProductRoot?.Products?.Count ?? 0) > 1;

        return new UpsellProduct
        {
            ProductId = product.Id,
            ProductRootId = product.ProductRootId,
            Name = product.ProductRoot?.RootName ?? product.Name ?? string.Empty,
            Description = product.ProductRoot?.MetaDescription ?? product.ProductRoot?.Description,
            Sku = product.Sku,
            Price = displayPrice.Amount,
            FormattedPrice = formattedPrice,
            PriceIncludesTax = displayPrice.IncludesTax,
            TaxRate = displayPrice.TaxRate,
            TaxAmount = displayPrice.IncludesTax ? displayPrice.TaxAmount : null,
            FormattedTaxAmount = formattedTaxAmount,
            OnSale = product.OnSale,
            PreviousPrice = displayPrice.CompareAtAmount,
            FormattedPreviousPrice = formattedPreviousPrice,
            Url = url,
            Images = images,
            AvailableForPurchase = product.AvailableForPurchase && product.CanPurchase,
            ProductTypeName = product.ProductRoot?.ProductType?.Name,
            HasVariants = hasVariants,
            Variants = variants
        };
    }

    private async Task<List<UpsellVariant>?> BuildVariantsAsync(
        Product product,
        StorefrontDisplayContext displayContext,
        CancellationToken ct)
    {
        var rootVariants = product.ProductRoot?.Products;
        if (rootVariants == null || rootVariants.Count <= 1)
        {
            return null;
        }

        var orderedVariants = rootVariants
            .Where(v => v.AvailableForPurchase && v.CanPurchase)
            .OrderByDescending(v => v.Id == product.Id)
            .ThenByDescending(v => v.Default)
            .ThenBy(v => v.Name)
            .ToList();

        if (orderedVariants.Count == 0)
        {
            return null;
        }

        var mappedVariants = new List<UpsellVariant>();
        foreach (var v in orderedVariants)
        {
            mappedVariants.Add(await MapToUpsellVariantAsync(v, displayContext, ct));
        }

        return mappedVariants;
    }

    private async Task<UpsellVariant> MapToUpsellVariantAsync(
        Product variant,
        StorefrontDisplayContext displayContext,
        CancellationToken ct)
    {
        var displayPrice = await variant.GetDisplayPriceAsync(displayContext, taxService, currencyService, ct);
        var formattedPrice = currencyService.FormatWithSymbol(
            displayPrice.Amount,
            displayPrice.CurrencySymbol,
            displayPrice.DecimalPlaces);

        return new UpsellVariant
        {
            ProductId = variant.Id,
            Name = variant.Name ?? variant.ProductRoot?.RootName ?? string.Empty,
            Sku = variant.Sku,
            Price = displayPrice.Amount,
            FormattedPrice = formattedPrice,
            AvailableForPurchase = variant.AvailableForPurchase && variant.CanPurchase
        };
    }

    private List<string> BuildProductImages(Product product, bool useAbsoluteUrls)
    {
        var images = new List<string>();

        if (product.Images.Count > 0)
        {
            images.AddRange(product.Images);
        }

        if (!product.ExcludeRootProductImages)
        {
            images.AddRange(product.ProductRoot?.RootImages ?? []);
        }

        images = images
            .Where(i => !string.IsNullOrWhiteSpace(i))
            .Distinct()
            .ToList();

        if (!useAbsoluteUrls || images.Count == 0)
        {
            return images;
        }

        return images
            .Select(BuildAbsoluteUrl)
            .Where(i => !string.IsNullOrWhiteSpace(i))
            .Select(i => i!)
            .ToList();
    }

    /// <summary>
    /// Builds the full product URL in the format /{RootUrl}/{VariantUrl}.
    /// Product.Url is just the variant segment; ProductRoot.RootUrl is the root segment.
    /// </summary>
    private static string? BuildProductUrl(Product product)
    {
        var rootUrl = product.ProductRoot?.RootUrl;
        if (string.IsNullOrWhiteSpace(rootUrl))
            return product.Url;

        var variantUrl = product.Url;
        if (string.IsNullOrWhiteSpace(variantUrl) || variantUrl == rootUrl)
            return $"/{rootUrl.TrimStart('/')}";

        return $"/{rootUrl.TrimStart('/')}/{variantUrl.TrimStart('/')}";
    }

    private string? BuildAbsoluteUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return null;
        }

        if (Uri.TryCreate(url, UriKind.Absolute, out _))
        {
            return url;
        }

        var storeWebsiteUrl = GetEffectiveStoreSettings().Store.WebsiteUrl;
        if (string.IsNullOrWhiteSpace(storeWebsiteUrl))
        {
            return url;
        }

        return $"{storeWebsiteUrl.TrimEnd('/')}/{url.TrimStart('/')}";
    }

    private MerchelloSettings GetEffectiveStoreSettings() =>
        _storeSettingsService?.GetRuntimeSettings().Merchello ?? _storeSettings;
}
