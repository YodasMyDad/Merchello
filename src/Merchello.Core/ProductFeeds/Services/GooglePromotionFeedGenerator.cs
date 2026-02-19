using System.Globalization;
using System.Xml.Linq;
using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services.Interfaces;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.ProductFeeds.Services;

public class GooglePromotionFeedGenerator(
    IHttpContextAccessor httpContextAccessor,
    ICurrencyService currencyService,
    IOptions<MerchelloSettings> settings,
    ILogger<GooglePromotionFeedGenerator> logger,
    IMerchelloStoreSettingsService? storeSettingsService = null) : IGooglePromotionFeedGenerator
{
    private readonly IMerchelloStoreSettingsService? _storeSettingsService = storeSettingsService;

    public Task<ProductPromotionFeedGenerationResult> GenerateAsync(
        ProductFeed feed,
        ProductFeedGenerationResult productFeedResult,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var warnings = new List<string>();
        var baseUrl = ResolveBaseUrl();
        var feedCurrency = feed.CurrencyCode.Trim().ToUpperInvariant();
        var storeName = ResolveStoreName();

        XNamespace g = "http://base.google.com/ns/1.0";
        var channel = new XElement("channel",
            new XElement("title", $"{storeName} Promotions Feed"),
            new XElement("link", baseUrl),
            new XElement("description", $"{storeName} Google Promotions Feed"));

        var promotions = productFeedResult.ReferencedPromotions
            .OrderBy(x => x.Priority)
            .ThenBy(x => x.EndsAtUtc ?? DateTime.MaxValue)
            .ThenBy(x => x.PromotionId)
            .ToList();

        var created = 0;

        foreach (var promotion in promotions)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (string.IsNullOrWhiteSpace(promotion.PromotionId) || string.IsNullOrWhiteSpace(promotion.Name))
            {
                warnings.Add("Promotion skipped because promotionId or name was missing.");
                continue;
            }

            var isCouponOffer = promotion.RequiresCouponCode;
            if (isCouponOffer && string.IsNullOrWhiteSpace(promotion.CouponCode))
            {
                warnings.Add($"Promotion '{promotion.PromotionId}' requires a coupon code and was skipped.");
                continue;
            }

            var hasPercentOff = promotion.PercentOff.HasValue && promotion.PercentOff.Value > 0m;
            var hasAmountOff = promotion.AmountOff.HasValue && promotion.AmountOff.Value > 0m;

            if (!hasPercentOff && !hasAmountOff)
            {
                warnings.Add($"Promotion '{promotion.PromotionId}' has no supported discount value and was skipped.");
                continue;
            }

            if (hasPercentOff && promotion.PercentOff!.Value > 100m)
            {
                warnings.Add($"Promotion '{promotion.PromotionId}' percent off exceeded 100 and was skipped.");
                continue;
            }

            var startsAtUtc = promotion.StartsAtUtc ?? DateTime.UtcNow;
            var endsAtUtc = promotion.EndsAtUtc ?? startsAtUtc.AddYears(1);
            if (endsAtUtc <= startsAtUtc)
            {
                warnings.Add($"Promotion '{promotion.PromotionId}' had an invalid date range and was normalized.");
                endsAtUtc = startsAtUtc.AddMinutes(1);
            }

            var item = new XElement("item",
                new XElement(g + "promotion_id", promotion.PromotionId),
                new XElement(g + "product_applicability", "specific_products"),
                new XElement(g + "offer_type", isCouponOffer ? "generic_code" : "no_code"),
                new XElement(g + "long_title", promotion.Name),
                new XElement(g + "promotion_effective_dates", $"{FormatUtc(startsAtUtc)}/{FormatUtc(endsAtUtc)}"),
                new XElement(g + "redemption_channel", "online"),
                new XElement(g + "promotion_destination", "Shopping_ads"),
                new XElement(g + "country_code", feed.CountryCode.Trim().ToUpperInvariant()),
                new XElement(g + "language_code", feed.LanguageCode.Trim().ToLowerInvariant()),
                new XElement(g + "currency_code", feedCurrency));

            if (isCouponOffer)
            {
                item.Add(new XElement(g + "coupon_code", promotion.CouponCode!.Trim()));
            }

            if (hasPercentOff)
            {
                item.Add(new XElement(g + "percent_off", promotion.PercentOff!.Value.ToString("0.##", CultureInfo.InvariantCulture)));
            }
            else
            {
                var rounded = currencyService.Round(promotion.AmountOff!.Value, feedCurrency);
                item.Add(new XElement(g + "money_off_amount", $"{rounded:0.00} {feedCurrency}"));
            }

            channel.Add(item);
            created++;
        }

        var rss = new XElement("rss",
            new XAttribute("version", "2.0"),
            new XAttribute(XNamespace.Xmlns + "g", g),
            channel);

        var document = new XDocument(new XDeclaration("1.0", "utf-8", "yes"), rss);

        logger.LogDebug(
            "Generated Google promotions feed for {FeedId} with {PromotionCount} promotions and {WarningCount} warnings",
            feed.Id,
            created,
            warnings.Count);

        return Task.FromResult(new ProductPromotionFeedGenerationResult
        {
            Xml = document.ToString(),
            PromotionCount = created,
            Warnings = warnings
        });
    }

    private string ResolveBaseUrl()
    {
        var request = httpContextAccessor.HttpContext?.Request;
        if (request != null && request.Host.HasValue)
        {
            return $"{request.Scheme}://{request.Host}{request.PathBase}".TrimEnd('/');
        }

        return ResolveStoreWebsiteUrl()?.TrimEnd('/') ?? "https://localhost";
    }

    private string ResolveStoreName() =>
        _storeSettingsService?.GetRuntimeSettings().Merchello.Store.Name ?? settings.Value.Store.Name ?? "Merchello";

    private string? ResolveStoreWebsiteUrl() =>
        _storeSettingsService?.GetRuntimeSettings().Merchello.Store.WebsiteUrl ?? settings.Value.Store.WebsiteUrl;

    private static string FormatUtc(DateTime value)
    {
        return value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture);
    }
}
