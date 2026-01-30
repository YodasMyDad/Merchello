using System.Text.Json;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.ExchangeRates.Providers;
using Merchello.Core.ExchangeRates.Providers.Interfaces;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.ExchangeRates.Services;

public class ExchangeRateCache(
    ICacheService cache,
    IExchangeRateProviderManager providerManager,
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IOptions<MerchelloSettings> merchelloSettings,
    IOptions<ExchangeRateOptions> exchangeRateOptions,
    ILogger<ExchangeRateCache> logger) : IExchangeRateCache
{
    private readonly MerchelloSettings _settings = merchelloSettings.Value;
    private readonly ExchangeRateOptions _options = exchangeRateOptions.Value;

    private string CacheKey => $"{Constants.CacheKeys.ExchangeRatesPrefix}{_settings.StoreCurrencyCode.ToUpperInvariant()}";

    public async Task<decimal?> GetRateAsync(
        string fromCurrency,
        string toCurrency,
        CancellationToken cancellationToken = default)
    {
        var quote = await GetRateQuoteAsync(fromCurrency, toCurrency, cancellationToken);
        return quote?.Rate;
    }

    public async Task<ExchangeRateQuote?> GetRateQuoteAsync(
        string fromCurrency,
        string toCurrency,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fromCurrency) || string.IsNullOrWhiteSpace(toCurrency))
        {
            return null;
        }

        if (string.Equals(fromCurrency, toCurrency, StringComparison.OrdinalIgnoreCase))
        {
            return new ExchangeRateQuote(1m, DateTime.UtcNow, "identity");
        }

        var snapshot = await GetSnapshotAsync(cancellationToken);
        if (snapshot == null)
        {
            return null;
        }

        var rate = CalculateCrossRate(snapshot, fromCurrency, toCurrency);
        if (!rate.HasValue)
        {
            return null;
        }

        return new ExchangeRateQuote(rate.Value, snapshot.TimestampUtc, snapshot.ProviderAlias);
    }

    public async Task<ExchangeRateSnapshot?> GetSnapshotAsync(CancellationToken cancellationToken = default)
    {
        var ttl = TimeSpan.FromMinutes(Math.Max(1, _options.CacheTtlMinutes));
        return await cache.GetOrCreateAsync(
            CacheKey,
            async ct =>
            {
                var fromDb = await TryLoadSnapshotFromDatabaseAsync(ct);
                if (fromDb != null)
                {
                    return fromDb;
                }

                await RefreshAsync(ct);
                return await TryLoadSnapshotFromDatabaseAsync(ct)
                       ?? new ExchangeRateSnapshot("none", _settings.StoreCurrencyCode.ToUpperInvariant(), new(), DateTime.UtcNow);
            },
            ttl,
            tags: [Constants.CacheTags.ExchangeRates],
            cancellationToken: cancellationToken);
    }

    public async Task SetSnapshotAsync(ExchangeRateSnapshot snapshot, CancellationToken cancellationToken = default)
    {
        if (snapshot.Rates.Count == 0)
        {
            return;
        }

        await PersistSnapshotToDatabaseAsync(snapshot, cancellationToken);
        await InvalidateAsync(cancellationToken);
    }

    public async Task<bool> RefreshAsync(CancellationToken cancellationToken = default)
    {
        var active = await providerManager.GetActiveProviderAsync(cancellationToken);
        if (active == null)
        {
            logger.LogWarning("No active exchange rate provider configured.");
            return false;
        }

        var baseCurrency = _settings.StoreCurrencyCode.ToUpperInvariant();
        var result = await active.Provider.GetRatesAsync(baseCurrency, cancellationToken);
        if (!result.Success || result.Rates.Count == 0)
        {
            logger.LogWarning(
                "Failed to refresh exchange rates from {ProviderAlias}: {Error}",
                active.Metadata.Alias,
                result.ErrorMessage ?? "Unknown error");
            return false;
        }

        var snapshot = new ExchangeRateSnapshot(
            active.Metadata.Alias,
            result.BaseCurrency.ToUpperInvariant(),
            result.Rates,
            result.TimestampUtc);

        await SetSnapshotAsync(snapshot, cancellationToken);
        return true;
    }

    public Task InvalidateAsync(CancellationToken cancellationToken = default)
        => cache.RemoveByTagAsync(Constants.CacheTags.ExchangeRates, cancellationToken);

    private static decimal? CalculateCrossRate(ExchangeRateSnapshot snapshot, string fromCurrency, string toCurrency)
    {
        var baseCurrency = snapshot.BaseCurrency;
        var from = fromCurrency.ToUpperInvariant();
        var to = toCurrency.ToUpperInvariant();

        if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase))
        {
            return 1m;
        }

        if (string.Equals(from, baseCurrency, StringComparison.OrdinalIgnoreCase))
        {
            return snapshot.Rates.TryGetValue(to, out var direct) ? direct : null;
        }

        if (string.Equals(to, baseCurrency, StringComparison.OrdinalIgnoreCase))
        {
            if (!snapshot.Rates.TryGetValue(from, out var inverseFrom) || inverseFrom == 0m)
            {
                return null;
            }

            return 1m / inverseFrom;
        }

        if (!snapshot.Rates.TryGetValue(to, out var baseTo) ||
            !snapshot.Rates.TryGetValue(from, out var baseFrom) ||
            baseFrom == 0m)
        {
            return null;
        }

        return baseTo / baseFrom;
    }

    private async Task<ExchangeRateSnapshot?> TryLoadSnapshotFromDatabaseAsync(CancellationToken cancellationToken)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var setting = await scope.ExecuteWithContextAsync(async db =>
            await db.ProviderConfigurations
                .OfType<ExchangeRateProviderSetting>()
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.IsEnabled, cancellationToken));
        scope.Complete();

        if (setting == null || string.IsNullOrWhiteSpace(setting.LastRatesJson))
        {
            return null;
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<ExchangeRateSnapshot>(setting.LastRatesJson);
            if (parsed == null || parsed.Rates.Count == 0)
            {
                return null;
            }

            return parsed;
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Failed to deserialize exchange rate snapshot from database.");
            return null;
        }
    }

    private async Task PersistSnapshotToDatabaseAsync(ExchangeRateSnapshot snapshot, CancellationToken cancellationToken)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var activeSetting = await db.ProviderConfigurations
                .OfType<ExchangeRateProviderSetting>()
                .FirstOrDefaultAsync(s => s.IsEnabled, cancellationToken);

            if (activeSetting == null)
            {
                activeSetting = new ExchangeRateProviderSetting
                {
                    ProviderKey = snapshot.ProviderAlias,
                    IsEnabled = true,
                    CreateDate = DateTime.UtcNow,
                    UpdateDate = DateTime.UtcNow
                };
                db.ProviderConfigurations.Add(activeSetting);
            }

            activeSetting.LastRatesJson = JsonSerializer.Serialize(snapshot);
            activeSetting.LastFetchedAt = DateTime.UtcNow;
            activeSetting.UpdateDate = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();
    }
}
