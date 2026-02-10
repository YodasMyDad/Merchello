using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Products.Services;

public class GoogleShoppingCategoryService(
    IOptions<GoogleShoppingCategorySettings> googleShoppingCategoryOptions,
    IOptions<MerchelloSettings> merchelloSettings,
    ICacheService cacheService,
    IHttpClientFactory httpClientFactory,
    ILogger<GoogleShoppingCategoryService> logger) : IGoogleShoppingCategoryService
{
    private const int DefaultLimit = 25;
    private const int MaxLimit = 100;
    private const string TaxonomyPrefix = "https://www.google.com/basepages/producttype/taxonomy.en-";

    private readonly GoogleShoppingCategorySettings _categorySettings = googleShoppingCategoryOptions.Value;
    private readonly MerchelloSettings _merchelloSettings = merchelloSettings.Value;

    public async Task<GoogleShoppingCategoryResultDto> GetCategoriesAsync(
        GetGoogleShoppingCategoriesParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var configuredUrls = NormalizeTaxonomyUrls(_categorySettings.TaxonomyUrls);
        var preferredCountryCode = ResolvePreferredCountryCode(parameters.CountryCode);
        var source = ResolveSource(preferredCountryCode, configuredUrls);
        var categories = await GetCategoriesFromCacheAsync(source.CountryCode, source.SourceUrl, cancellationToken);

        var query = parameters.Query?.Trim();
        var limit = NormalizeLimit(parameters.Limit);
        var filtered = FilterCategories(categories, query).Take(limit).ToList();

        return new GoogleShoppingCategoryResultDto
        {
            CountryCode = source.CountryCode,
            SourceUrl = source.SourceUrl,
            Categories = filtered
        };
    }

    private async Task<List<string>> GetCategoriesFromCacheAsync(string countryCode, string sourceUrl, CancellationToken cancellationToken)
    {
        var cacheKey = $"{Constants.CacheKeys.GoogleShoppingTaxonomyPrefix}{countryCode}";
        var cacheDurationHours = Math.Clamp(_categorySettings.CacheHours, 1, 24 * 7);
        var cacheTtl = TimeSpan.FromHours(cacheDurationHours);

        return await cacheService.GetOrCreateAsync(
            cacheKey,
            async ct => await FetchCategoriesAsync(countryCode, sourceUrl, ct),
            cacheTtl,
            [Constants.CacheTags.GoogleShoppingTaxonomy],
            cancellationToken);
    }

    private async Task<List<string>> FetchCategoriesAsync(string countryCode, string sourceUrl, CancellationToken cancellationToken)
    {
        try
        {
            var client = httpClientFactory.CreateClient();
            using var response = await client.GetAsync(sourceUrl, cancellationToken);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            return ParseTaxonomyContent(content);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to fetch Google Shopping taxonomy for country {CountryCode} from {SourceUrl}", countryCode, sourceUrl);
            return [];
        }
    }

    private static List<string> ParseTaxonomyContent(string content)
    {
        return content
            .Split('\n', StringSplitOptions.RemoveEmptyEntries)
            .Select(line => line.Trim())
            .Where(line => !string.IsNullOrWhiteSpace(line) && !line.StartsWith('#'))
            .Select(NormalizeCategoryLine)
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string NormalizeCategoryLine(string line)
    {
        var separatorIndex = line.IndexOf(" - ", StringComparison.Ordinal);
        if (separatorIndex <= 0)
        {
            return line;
        }

        var idPart = line[..separatorIndex];
        if (!int.TryParse(idPart, out _))
        {
            return line;
        }

        return line[(separatorIndex + 3)..].Trim();
    }

    private static IEnumerable<string> FilterCategories(IEnumerable<string> categories, string? query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return categories.OrderBy(category => category, StringComparer.OrdinalIgnoreCase);
        }

        return categories
            .Where(category => category.Contains(query, StringComparison.OrdinalIgnoreCase))
            .OrderBy(category => category.StartsWith(query, StringComparison.OrdinalIgnoreCase) ? 0 : 1)
            .ThenBy(category => category, StringComparer.OrdinalIgnoreCase);
    }

    private static int NormalizeLimit(int limit)
    {
        if (limit <= 0)
        {
            return DefaultLimit;
        }

        return Math.Min(limit, MaxLimit);
    }

    private string ResolvePreferredCountryCode(string? requestedCountryCode)
    {
        return NormalizeCountryCode(requestedCountryCode)
            ?? NormalizeCountryCode(_merchelloSettings.DefaultShippingCountry)
            ?? NormalizeCountryCode(_categorySettings.FallbackCountryCode)
            ?? Constants.FallbackCountryCode;
    }

    private (string CountryCode, string SourceUrl) ResolveSource(
        string preferredCountryCode,
        IReadOnlyDictionary<string, string> configuredUrls)
    {
        if (configuredUrls.TryGetValue(preferredCountryCode, out var preferredUrl))
        {
            return (preferredCountryCode, preferredUrl);
        }

        var fallbackCountryCode = NormalizeCountryCode(_categorySettings.FallbackCountryCode) ?? Constants.FallbackCountryCode;
        if (configuredUrls.TryGetValue(fallbackCountryCode, out var fallbackUrl))
        {
            return (fallbackCountryCode, fallbackUrl);
        }

        return (Constants.FallbackCountryCode, $"{TaxonomyPrefix}{Constants.FallbackCountryCode}.txt");
    }

    private static IReadOnlyDictionary<string, string> NormalizeTaxonomyUrls(
        IReadOnlyDictionary<string, string>? sourceUrls)
    {
        if (sourceUrls == null || sourceUrls.Count == 0)
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        var normalized = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (countryCode, sourceUrl) in sourceUrls)
        {
            var normalizedCode = NormalizeCountryCode(countryCode);
            if (normalizedCode == null || string.IsNullOrWhiteSpace(sourceUrl))
            {
                continue;
            }

            normalized[normalizedCode] = sourceUrl.Trim();
        }

        return normalized;
    }

    private static string? NormalizeCountryCode(string? countryCode)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return null;
        }

        return countryCode.Trim().ToUpperInvariant();
    }
}

