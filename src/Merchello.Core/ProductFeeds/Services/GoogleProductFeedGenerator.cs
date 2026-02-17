using System.Text.Json;
using System.Xml.Linq;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services.Interfaces;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Warehouses.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.ProductFeeds.Services;

public class GoogleProductFeedGenerator(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IExchangeRateCache exchangeRateCache,
    ITaxService taxService,
    IProductFeedResolverRegistry resolverRegistry,
    IProductFeedMediaUrlResolver mediaUrlResolver,
    IShippingOptionEligibilityService shippingOptionEligibilityService,
    IShippingProviderManager shippingProviderManager,
    IHttpContextAccessor httpContextAccessor,
    ICurrencyService currencyService,
    IOptions<MerchelloSettings> settings,
    ILogger<GoogleProductFeedGenerator> logger) : IGoogleProductFeedGenerator
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private static readonly HashSet<string> TaxExclusiveCountries =
        new(["US", "CA"], StringComparer.OrdinalIgnoreCase);

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

    private static readonly HashSet<string> AllowedConditions =
        new(["new", "used", "refurbished"], StringComparer.OrdinalIgnoreCase);

    public async Task<ProductFeedGenerationResult> GenerateAsync(ProductFeed feed, CancellationToken cancellationToken = default)
    {
        var warnings = new List<string>();
        logger.LogDebug("Generating Google product feed for {FeedId} ({FeedSlug})", feed.Id, feed.Slug);
        var filterConfig = Deserialize(feed.FilterConfigJson, new ProductFeedFilterConfig());
        var customLabels = Deserialize(feed.CustomLabelsJson, new List<ProductFeedCustomLabelConfig>());
        var customFields = Deserialize(feed.CustomFieldsJson, new List<ProductFeedCustomFieldConfig>());
        var manualPromotions = Deserialize(feed.ManualPromotionsJson, new List<ProductFeedManualPromotion>());
        var labelsBySlot = customLabels
            .Where(l => l.Slot >= 0 && l.Slot <= 4)
            .GroupBy(l => l.Slot)
            .Select(gp => gp.First())
            .ToDictionary(x => x.Slot, x => x);
        var resolversByAlias = resolverRegistry.GetResolvers()
            .Where(r => !string.IsNullOrWhiteSpace(r.Alias))
            .GroupBy(r => r.Alias, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .ToDictionary(r => r.Alias.Trim(), r => r, StringComparer.OrdinalIgnoreCase);

        var supportedCustomFields = new List<ProductFeedCustomFieldConfig>();
        foreach (var customField in customFields)
        {
            var attribute = NormalizeCustomAttribute(customField.Attribute);
            if (string.IsNullOrWhiteSpace(attribute) || !AllowedCustomAttributes.Contains(attribute))
            {
                warnings.Add($"Unsupported custom field '{customField.Attribute}' was ignored.");
                continue;
            }

            supportedCustomFields.Add(new ProductFeedCustomFieldConfig
            {
                Attribute = attribute,
                SourceType = customField.SourceType,
                StaticValue = customField.StaticValue,
                ResolverAlias = customField.ResolverAlias,
                Args = customField.Args ?? []
            });
        }

        var baseUrl = ResolveBaseUrl();
        var storeCurrency = settings.Value.StoreCurrencyCode.ToUpperInvariant();
        var feedCurrency = feed.CurrencyCode.ToUpperInvariant();

        var conversionRate = 1m;
        if (!string.Equals(storeCurrency, feedCurrency, StringComparison.OrdinalIgnoreCase))
        {
            conversionRate = await exchangeRateCache.GetRateAsync(storeCurrency, feedCurrency, cancellationToken) ?? 0m;
            if (conversionRate <= 0m)
            {
                throw new InvalidOperationException(
                    $"Missing exchange rate from {storeCurrency} to {feedCurrency} for feed '{feed.Name}'.");
            }
        }

        var enabledProviders = await shippingProviderManager.GetEnabledProvidersAsync(cancellationToken);
        var enabledProviderKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "flat-rate"
        };
        var usesLiveRatesLookup = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase)
        {
            ["flat-rate"] = false
        };
        var providerDisplayNames = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["flat-rate"] = "Flat Rate"
        };

        foreach (var provider in enabledProviders)
        {
            var providerKey = provider.Metadata.Key;
            enabledProviderKeys.Add(providerKey);
            usesLiveRatesLookup[providerKey] = provider.Metadata.ConfigCapabilities.UsesLiveRates;
            providerDisplayNames[providerKey] = provider.DisplayName;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var candidateProducts = await scope.ExecuteWithContextAsync(async db =>
            await db.Products
                .AsNoTracking()
                .Include(p => p.Filters)
                .Include(p => p.ProductWarehouses)
                .Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr.ProductType)
                .Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr.Collections)
                .Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr.ProductRootWarehouses)
                        .ThenInclude(prw => prw.Warehouse)
                            .ThenInclude(w => w!.Supplier)
                .Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr.ProductRootWarehouses)
                        .ThenInclude(prw => prw.Warehouse)
                            .ThenInclude(w => w!.ShippingOptions)
                .AsSplitQuery()
                .ToListAsync(cancellationToken));
        scope.Complete();

        var filteredProducts = candidateProducts
            .Where(p => MatchesFeedFilters(p, filterConfig))
            .Where(p => !p.RemoveFromFeed)
            .ToList();

        // Determine variant grouping from the underlying product model, not only emitted rows.
        // This keeps item_group_id stable even when feed filters/remove-from-feed hide siblings.
        var variantCountByRoot = candidateProducts
            .GroupBy(p => p.ProductRootId)
            .ToDictionary(g => g.Key, g => g.Count());

        var promotionAssignments = await BuildPromotionAssignmentsAsync(filteredProducts, manualPromotions, warnings, cancellationToken);
        var referencedPromotions = promotionAssignments.ReferencedPromotions;
        var promotionIdsByProduct = promotionAssignments.PromotionIdsByProduct;

        var taxRatesByGroup = new Dictionary<Guid, decimal>();

        XNamespace g = "http://base.google.com/ns/1.0";
        var channel = new XElement("channel",
            new XElement("title", settings.Value.Store.Name ?? "Merchello"),
            new XElement("link", baseUrl),
            new XElement("description", $"{settings.Value.Store.Name ?? "Merchello"} Google Shopping Feed"));

        var generatedItems = new List<ProductFeedGeneratedItem>(filteredProducts.Count);

        foreach (var product in filteredProducts)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var root = product.ProductRoot;
            var item = new XElement("item");

            var title = ResolveTitle(product, root) ?? product.Id.ToString();
            var description = FirstNonEmpty(product.ShoppingFeedDescription, root.Description, root.MetaDescription, root.RootName) ?? product.Id.ToString();
            var link = BuildProductLink(baseUrl, root.RootUrl, product.Url);
            var imageLink = ResolveImageLink(baseUrl, product, root);
            var availability = ResolveAvailability(product);
            var condition = NormalizeCondition(
                FirstNonEmpty(product.ShoppingFeedCondition, root.ShoppingFeedCondition, "new"),
                product.Id,
                warnings);
            var brand = ResolveBrand(product, root);

            if (string.IsNullOrWhiteSpace(link))
            {
                warnings.Add($"Product {product.Id} has no resolvable link.");
                link = baseUrl;
            }

            if (string.IsNullOrWhiteSpace(imageLink))
            {
                warnings.Add($"Product {product.Id} has no image link.");
            }

            var taxInclusive = feed.IncludeTaxInPrice ?? !TaxExclusiveCountries.Contains(feed.CountryCode);
            var price = await ResolveDisplayPriceAsync(product.Price, root.TaxGroupId, feed.CountryCode, taxInclusive, conversionRate, feedCurrency, taxRatesByGroup, cancellationToken);
            var hasValidSale = product.OnSale && product.PreviousPrice.HasValue && product.PreviousPrice.Value > product.Price;

            item.Add(new XElement(g + "id", product.Id.ToString()));
            item.Add(new XElement(g + "title", title));
            item.Add(new XElement(g + "description", description));
            item.Add(new XElement(g + "link", link));
            if (!string.IsNullOrWhiteSpace(imageLink))
            {
                item.Add(new XElement(g + "image_link", imageLink));
            }

            item.Add(new XElement(g + "availability", availability));
            item.Add(new XElement(g + "price", price));
            item.Add(new XElement(g + "condition", condition));

            if (hasValidSale)
            {
                var previousPrice = await ResolveDisplayPriceAsync(
                    product.PreviousPrice!.Value,
                    root.TaxGroupId,
                    feed.CountryCode,
                    taxInclusive,
                    conversionRate,
                    feedCurrency,
                    taxRatesByGroup,
                    cancellationToken);

                item.SetElementValue(g + "price", previousPrice);
                item.Add(new XElement(g + "sale_price", price));
            }

            if (!string.IsNullOrWhiteSpace(product.Gtin))
            {
                item.Add(new XElement(g + "gtin", product.Gtin));
            }

            if (!string.IsNullOrWhiteSpace(product.SupplierSku))
            {
                item.Add(new XElement(g + "mpn", product.SupplierSku));
            }

            if (string.IsNullOrWhiteSpace(product.Gtin) && string.IsNullOrWhiteSpace(product.SupplierSku))
            {
                item.Add(new XElement(g + "identifier_exists", "no"));
            }

            if (!string.IsNullOrWhiteSpace(brand))
            {
                item.Add(new XElement(g + "brand", brand));
            }

            if (!string.IsNullOrWhiteSpace(root.GoogleShoppingFeedCategory))
            {
                item.Add(new XElement(g + "google_product_category", root.GoogleShoppingFeedCategory));
            }

            if (variantCountByRoot.TryGetValue(product.ProductRootId, out var rootCount) && rootCount > 1)
            {
                item.Add(new XElement(g + "item_group_id", product.ProductRootId.ToString()));
            }

            AddOptionalElement(item, g + "color", FirstNonEmpty(product.ShoppingFeedColour, InferOptionValue(product, "colour"), InferOptionValue(product, "color")));
            AddOptionalElement(item, g + "material", FirstNonEmpty(product.ShoppingFeedMaterial, InferOptionValue(product, "material")));
            AddOptionalElement(item, g + "size", FirstNonEmpty(product.ShoppingFeedSize, InferOptionValue(product, "size")));
            AddOptionalElement(item, g + "width", product.ShoppingFeedWidth);
            AddOptionalElement(item, g + "height", product.ShoppingFeedHeight);

            var shippingLabel = ResolveShippingLabel(
                product,
                feed.CountryCode,
                enabledProviderKeys,
                usesLiveRatesLookup,
                providerDisplayNames);
            AddOptionalElement(item, g + "shipping_label", shippingLabel);

            var resolverContext = new ProductFeedResolverContext
            {
                Product = product,
                ProductRoot = root,
                Feed = feed
            };

            for (var slot = 0; slot <= 4; slot++)
            {
                if (!labelsBySlot.TryGetValue(slot, out var labelConfig))
                {
                    continue;
                }

                var value = await ResolveConfiguredValueAsync(
                    labelConfig.SourceType,
                    labelConfig.StaticValue,
                    labelConfig.ResolverAlias,
                    labelConfig.Args ?? new Dictionary<string, string>(),
                    resolverContext,
                    resolversByAlias,
                    warnings,
                    cancellationToken);
                AddOptionalElement(item, g + $"custom_label_{slot}", value);
            }

            foreach (var customField in supportedCustomFields)
            {
                var value = await ResolveConfiguredValueAsync(
                    customField.SourceType,
                    customField.StaticValue,
                    customField.ResolverAlias,
                    customField.Args ?? new Dictionary<string, string>(),
                    resolverContext,
                    resolversByAlias,
                    warnings,
                    cancellationToken);
                AddOptionalElement(item, g + customField.Attribute, value);
            }

            var promotionIds = promotionIdsByProduct.TryGetValue(product.Id, out var ids)
                ? ids
                : [];

            foreach (var promotionId in promotionIds)
            {
                item.Add(new XElement(g + "promotion_id", promotionId));
            }

            generatedItems.Add(new ProductFeedGeneratedItem
            {
                ProductId = product.Id,
                ProductRootId = product.ProductRootId,
                PromotionIds = promotionIds
            });

            channel.Add(item);
        }

        var rss = new XElement("rss",
            new XAttribute("version", "2.0"),
            new XAttribute(XNamespace.Xmlns + "g", g),
            channel);

        var document = new XDocument(new XDeclaration("1.0", "utf-8", "yes"), rss);
        logger.LogDebug(
            "Generated Google product feed for {FeedId} with {ItemCount} items and {WarningCount} warnings",
            feed.Id,
            filteredProducts.Count,
            warnings.Count);

        return new ProductFeedGenerationResult
        {
            Xml = document.ToString(),
            ItemCount = filteredProducts.Count,
            Warnings = warnings,
            Items = generatedItems,
            ReferencedPromotions = referencedPromotions
        };
    }

    private async Task<(Dictionary<Guid, List<string>> PromotionIdsByProduct, List<ProductFeedPromotionDefinition> ReferencedPromotions)> BuildPromotionAssignmentsAsync(
        List<Product> products,
        List<ProductFeedManualPromotion> manualPromotions,
        List<string> warnings,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var definitions = new Dictionary<string, ProductFeedPromotionDefinition>(StringComparer.OrdinalIgnoreCase);
        var idsByProduct = products.ToDictionary(p => p.Id, _ => new List<string>());
        var discountContextByProduct = products.ToDictionary(p => p.Id, BuildDiscountContextLineItem);

        using var scope = efCoreScopeProvider.CreateScope();
        var discounts = await scope.ExecuteWithContextAsync(async db =>
            await db.Discounts
                .AsNoTracking()
                .Where(d => d.ShowInFeed)
                .ToListAsync(cancellationToken));
        scope.Complete();

        foreach (var discount in discounts)
        {
            if (discount.Status is DiscountStatus.Draft or DiscountStatus.Disabled or DiscountStatus.Expired)
            {
                continue;
            }

            if (discount.StartsAt > now)
            {
                continue;
            }

            if (discount.EndsAt.HasValue && discount.EndsAt.Value < now)
            {
                continue;
            }

            if (discount.Category is not (DiscountCategory.AmountOffProducts or DiscountCategory.AmountOffOrder))
            {
                continue;
            }

            if (discount.Method is not (DiscountMethod.Automatic or DiscountMethod.Code))
            {
                continue;
            }

            if (discount.ValueType is not (DiscountValueType.Percentage or DiscountValueType.FixedAmount))
            {
                continue;
            }

            var promotionId = $"discount-{discount.Id:N}";
            definitions[promotionId] = new ProductFeedPromotionDefinition
            {
                PromotionId = promotionId,
                Name = FirstNonEmpty(discount.FeedPromotionName, discount.Name) ?? promotionId,
                Description = discount.Description,
                RequiresCouponCode = discount.Method == DiscountMethod.Code,
                CouponCode = discount.Code,
                StartsAtUtc = discount.StartsAt,
                EndsAtUtc = discount.EndsAt,
                Priority = discount.Priority,
                PercentOff = discount.ValueType == DiscountValueType.Percentage ? discount.Value : null,
                AmountOff = discount.ValueType == DiscountValueType.FixedAmount ? discount.Value : null
            };

            foreach (var product in products)
            {
                var contextLineItem = discountContextByProduct[product.Id];
                var matches = DiscountTargetMatcher.DoesLineItemMatchTargetRules(contextLineItem, discount.TargetRules);

                if (!matches)
                {
                    continue;
                }

                idsByProduct[product.Id].Add(promotionId);
            }
        }

        foreach (var manual in manualPromotions)
        {
            if (string.IsNullOrWhiteSpace(manual.PromotionId) || string.IsNullOrWhiteSpace(manual.Name))
            {
                warnings.Add("Manual promotion skipped because promotionId or name was missing.");
                continue;
            }

            if (manual.StartsAtUtc.HasValue && manual.StartsAtUtc.Value > now)
            {
                continue;
            }

            if (manual.EndsAtUtc.HasValue && manual.EndsAtUtc.Value < now)
            {
                continue;
            }

            definitions[manual.PromotionId] = new ProductFeedPromotionDefinition
            {
                PromotionId = manual.PromotionId,
                Name = manual.Name,
                Description = manual.Description,
                RequiresCouponCode = manual.RequiresCouponCode,
                CouponCode = manual.CouponCode,
                StartsAtUtc = manual.StartsAtUtc,
                EndsAtUtc = manual.EndsAtUtc,
                Priority = manual.Priority,
                PercentOff = manual.PercentOff,
                AmountOff = manual.AmountOff
            };

            foreach (var product in products)
            {
                if (!MatchesFeedFilters(product, manual.FilterConfig ?? new ProductFeedFilterConfig()))
                {
                    continue;
                }

                idsByProduct[product.Id].Add(manual.PromotionId);
            }
        }

        foreach (var product in products)
        {
            var sorted = idsByProduct[product.Id]
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(id => definitions.TryGetValue(id, out var def) ? def.Priority : int.MaxValue)
                .ThenBy(id => definitions.TryGetValue(id, out var def) ? def.EndsAtUtc ?? DateTime.MaxValue : DateTime.MaxValue)
                .ThenBy(id => id)
                .Take(10)
                .ToList();

            idsByProduct[product.Id] = sorted;
        }

        var usedIds = idsByProduct
            .SelectMany(x => x.Value)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var referencedPromotions = definitions.Values
            .Where(x => usedIds.Contains(x.PromotionId))
            .OrderBy(x => x.Priority)
            .ThenBy(x => x.EndsAtUtc ?? DateTime.MaxValue)
            .ThenBy(x => x.PromotionId)
            .ToList();

        return (idsByProduct, referencedPromotions);
    }

    private static DiscountContextLineItem BuildDiscountContextLineItem(Product product)
    {
        var root = product.ProductRoot;
        var prioritizedWarehouse = root.ProductRootWarehouses
            .OrderBy(x => x.PriorityOrder)
            .FirstOrDefault();

        var supplierId = prioritizedWarehouse?.Warehouse?.SupplierId;

        return new DiscountContextLineItem
        {
            LineItemId = product.Id,
            ProductId = product.Id,
            ProductRootId = root.Id,
            CollectionIds = root.Collections.Select(c => c.Id).ToList(),
            ProductFilterIds = product.Filters.Select(f => f.Id).ToList(),
            ProductTypeId = root.ProductTypeId,
            SupplierId = supplierId,
            WarehouseId = prioritizedWarehouse?.WarehouseId,
            Sku = product.Sku ?? string.Empty,
            Quantity = 1,
            UnitPrice = product.Price,
            LineTotal = product.Price,
            IsTaxable = true,
            TaxRate = 0m,
            IsAddon = false,
            ParentLineItemId = null
        };
    }

    private static bool MatchesFeedFilters(Product product, ProductFeedFilterConfig filterConfig)
    {
        var root = product.ProductRoot;

        if (filterConfig.ProductTypeIds.Count > 0 && !filterConfig.ProductTypeIds.Contains(root.ProductTypeId))
        {
            return false;
        }

        if (filterConfig.CollectionIds.Count > 0 && !root.Collections.Any(c => filterConfig.CollectionIds.Contains(c.Id)))
        {
            return false;
        }

        foreach (var group in filterConfig.FilterValueGroups)
        {
            if (group.FilterIds.Count == 0)
            {
                continue;
            }

            var matchesGroup = product.Filters.Any(f =>
                f.ProductFilterGroupId == group.FilterGroupId &&
                group.FilterIds.Contains(f.Id));

            if (!matchesGroup)
            {
                return false;
            }
        }

        return true;
    }

    private async Task<string?> ResolveConfiguredValueAsync(
        string sourceType,
        string? staticValue,
        string? resolverAlias,
        IReadOnlyDictionary<string, string> args,
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, IProductFeedValueResolver> resolversByAlias,
        List<string> warnings,
        CancellationToken cancellationToken)
    {
        if (string.Equals(sourceType, "resolver", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(resolverAlias))
            {
                warnings.Add("Resolver source selected but resolver alias was missing.");
                return null;
            }

            if (!resolversByAlias.TryGetValue(resolverAlias.Trim(), out var resolver))
            {
                warnings.Add($"Resolver '{resolverAlias}' was not found.");
                return null;
            }

            return await resolver.ResolveAsync(context, args, cancellationToken);
        }

        return staticValue;
    }

    private async Task<string> ResolveDisplayPriceAsync(
        decimal basePrice,
        Guid taxGroupId,
        string countryCode,
        bool taxInclusive,
        decimal conversionRate,
        string feedCurrency,
        Dictionary<Guid, decimal> taxRatesByGroup,
        CancellationToken cancellationToken)
    {
        var price = basePrice;

        if (taxInclusive)
        {
            if (!taxRatesByGroup.TryGetValue(taxGroupId, out var taxRate))
            {
                taxRate = await taxService.GetApplicableRateAsync(taxGroupId, countryCode, null, cancellationToken);
                taxRatesByGroup[taxGroupId] = taxRate;
            }

            price += price * (taxRate / 100m);
        }

        var converted = currencyService.Round(price * conversionRate, feedCurrency);
        return $"{converted:0.00} {feedCurrency}";
    }

    private string ResolveBaseUrl()
    {
        var request = httpContextAccessor.HttpContext?.Request;
        if (request != null && request.Host.HasValue)
        {
            return $"{request.Scheme}://{request.Host}{request.PathBase}".TrimEnd('/');
        }

        return settings.Value.Store.WebsiteUrl?.TrimEnd('/') ?? "https://localhost";
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        return values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v))?.Trim();
    }

    private static string? ResolveTitle(Product product, ProductRoot root)
    {
        var configuredTitle = FirstNonEmpty(product.ShoppingFeedTitle);
        if (!string.IsNullOrWhiteSpace(configuredTitle))
        {
            return configuredTitle;
        }

        var rootName = FirstNonEmpty(root.RootName);
        var productName = FirstNonEmpty(product.Name);

        if (!string.IsNullOrWhiteSpace(rootName) && !string.IsNullOrWhiteSpace(productName))
        {
            if (string.Equals(rootName, productName, StringComparison.OrdinalIgnoreCase))
            {
                return rootName;
            }

            return $"{rootName} - {productName}";
        }

        return FirstNonEmpty(productName, rootName);
    }

    private string? ResolveImageLink(string baseUrl, Product product, ProductRoot root)
    {
        var imageReference = product.Images.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(imageReference))
        {
            imageReference = root.RootImages.FirstOrDefault();
        }

        if (string.IsNullOrWhiteSpace(imageReference))
        {
            return null;
        }

        var resolved = mediaUrlResolver.ResolveMediaUrl(imageReference) ?? imageReference;
        return ToAbsoluteUrl(baseUrl, resolved);
    }

    private static string ResolveAvailability(Product product)
    {
        if (!product.CanPurchase || !product.AvailableForPurchase)
        {
            return "out_of_stock";
        }

        var trackedWarehouses = product.ProductWarehouses.Where(w => w.TrackStock).ToList();
        if (trackedWarehouses.Count == 0)
        {
            return "in_stock";
        }

        var hasStock = trackedWarehouses.Any(w => (w.Stock - w.ReservedStock) > 0);
        return hasStock ? "in_stock" : "out_of_stock";
    }

    private string ResolveBrand(Product product, ProductRoot root)
    {
        var configuredBrand = FirstNonEmpty(product.ShoppingFeedBrand, root.ShoppingFeedBrand);
        if (!string.IsNullOrWhiteSpace(configuredBrand))
        {
            return configuredBrand!;
        }

        var prioritizedSupplier = root.ProductRootWarehouses
            .OrderBy(x => x.PriorityOrder)
            .Select(x => x.Warehouse?.Supplier?.Name)
            .FirstOrDefault(n => !string.IsNullOrWhiteSpace(n));

        if (!string.IsNullOrWhiteSpace(prioritizedSupplier))
        {
            return prioritizedSupplier!;
        }

        var firstSupplier = root.ProductRootWarehouses
            .Select(x => x.Warehouse?.Supplier?.Name)
            .FirstOrDefault(n => !string.IsNullOrWhiteSpace(n));

        return firstSupplier ?? settings.Value.Store.Name ?? "Merchello";
    }

    private static string? InferOptionValue(Product product, string optionTypeAlias)
    {
        var options = product.ProductRoot.ProductOptions
            .Where(o => o.IsVariant && string.Equals(o.OptionTypeAlias, optionTypeAlias, StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (options.Count == 0 || string.IsNullOrWhiteSpace(product.Name))
        {
            return null;
        }

        foreach (var option in options)
        {
            foreach (var value in option.ProductOptionValues.OrderBy(v => v.SortOrder))
            {
                if (string.IsNullOrWhiteSpace(value.Name))
                {
                    continue;
                }

                if (product.Name.Contains(value.Name, StringComparison.OrdinalIgnoreCase))
                {
                    return value.Name;
                }
            }
        }

        return null;
    }

    private string? ResolveShippingLabel(
        Product product,
        string countryCode,
        IReadOnlySet<string> enabledProviderKeys,
        IReadOnlyDictionary<string, bool> usesLiveRatesLookup,
        IReadOnlyDictionary<string, string> providerDisplayNames)
    {
        var rootWarehouses = product.ProductRoot.ProductRootWarehouses
            .OrderBy(x => x.PriorityOrder)
            .Select(x => x.Warehouse)
            .Where(x => x != null)
            .Cast<Warehouse>()
            .ToList();

        foreach (var warehouse in rootWarehouses)
        {
            if (!warehouse.CanServeRegion(countryCode, null))
            {
                continue;
            }

            var candidateOptions = warehouse.ShippingOptions
                .Where(s => s.IsEnabled);

            if (!product.ProductRoot.AllowExternalCarrierShipping)
            {
                candidateOptions = candidateOptions
                    .Where(s => !usesLiveRatesLookup.GetValueOrDefault(s.ProviderKey, false));
            }

            var eligible = shippingOptionEligibilityService.GetEligibleOptions(
                    candidateOptions,
                    countryCode,
                    null,
                    enabledProviderKeys,
                    usesLiveRatesLookup)
                .Select(x => x.Option)
                .OrderBy(x => x.Name)
                .FirstOrDefault();

            if (eligible != null)
            {
                return FirstNonEmpty(
                    eligible.Name,
                    eligible.ServiceType,
                    providerDisplayNames.GetValueOrDefault(eligible.ProviderKey));
            }
        }

        return null;
    }

    private static void AddOptionalElement(XElement parent, XName name, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        parent.Add(new XElement(name, value.Trim()));
    }

    private static string? BuildProductLink(string baseUrl, string? rootUrl, string? variantUrl)
    {
        if (Uri.TryCreate(variantUrl, UriKind.Absolute, out var absoluteVariant))
        {
            return absoluteVariant.ToString();
        }

        var normalizedRoot = NormalizePath(rootUrl);
        var normalizedVariant = NormalizePath(variantUrl);

        string? combinedPath;
        if (string.IsNullOrWhiteSpace(normalizedVariant))
        {
            combinedPath = normalizedRoot;
        }
        else if (string.IsNullOrWhiteSpace(normalizedRoot) ||
                 string.Equals(normalizedVariant, normalizedRoot, StringComparison.OrdinalIgnoreCase) ||
                 normalizedVariant.StartsWith($"{normalizedRoot}/", StringComparison.OrdinalIgnoreCase))
        {
            combinedPath = normalizedVariant;
        }
        else
        {
            combinedPath = $"{normalizedRoot}/{normalizedVariant}";
        }

        return ToAbsoluteUrl(baseUrl, combinedPath);
    }

    private static string NormalizeCondition(string? value, Guid productId, List<string> warnings)
    {
        var normalized = value?.Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(normalized) && AllowedConditions.Contains(normalized))
        {
            return normalized;
        }

        if (!string.IsNullOrWhiteSpace(value))
        {
            warnings.Add($"Product {productId} had unsupported condition '{value}'. Defaulted to 'new'.");
        }

        return "new";
    }

    private static string NormalizeCustomAttribute(string? attribute)
    {
        if (string.IsNullOrWhiteSpace(attribute))
        {
            return string.Empty;
        }

        return attribute.Trim().ToLowerInvariant().Replace(" ", "_").Replace("-", "_");
    }

    private static string? NormalizePath(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim().Trim('/');
    }

    private static string? ToAbsoluteUrl(string baseUrl, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (Uri.TryCreate(value, UriKind.Absolute, out var absoluteUri))
        {
            return absoluteUri.ToString();
        }

        if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var baseUri))
        {
            return null;
        }

        var relative = value.StartsWith('/') ? value : $"/{value}";
        return new Uri(baseUri, relative).ToString();
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
}
