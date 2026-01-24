using System.Net.Http.Json;
using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.ExchangeRates.Providers.Interfaces;
using Merchello.Core.Shared.Providers;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.ExchangeRates.Providers;

public class FrankfurterExchangeRateProvider(
    IHttpClientFactory httpClientFactory,
    ILogger<FrankfurterExchangeRateProvider> logger) : IExchangeRateProvider
{
    private const string BaseUrl = "https://api.frankfurter.dev/v1";
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    public ExchangeRateProviderMetadata Metadata => new(
        Alias: "frankfurter",
        DisplayName: "Frankfurter (ECB Rates)",
        Icon: "icon-globe",
        Description: "Free exchange rates from the European Central Bank via frankfurter.dev",
        SupportsHistoricalRates: true,
        SupportedCurrencies: []);

    public ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
        => ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>([]);

    public ValueTask ConfigureAsync(
        ExchangeRateProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
        => ValueTask.CompletedTask;

    public async Task<ExchangeRateResult> GetRatesAsync(
        string baseCurrency,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(baseCurrency))
        {
            return new ExchangeRateResult(false, "", new(), DateTime.UtcNow, "Base currency is required.");
        }

        try
        {
            var response = await _httpClient.GetAsync(
                $"{BaseUrl}/latest?base={Uri.EscapeDataString(baseCurrency.ToUpperInvariant())}",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return new ExchangeRateResult(
                    false,
                    baseCurrency.ToUpperInvariant(),
                    new(),
                    DateTime.UtcNow,
                    $"API returned {response.StatusCode}");
            }

            var data = await response.Content.ReadFromJsonAsync<FrankfurterResponse>(cancellationToken: cancellationToken);
            if (data?.Rates == null || string.IsNullOrWhiteSpace(data.Base))
            {
                return new ExchangeRateResult(false, baseCurrency.ToUpperInvariant(), new(), DateTime.UtcNow, "Invalid response.");
            }

            var timestampUtc = DateTime.UtcNow;
            if (DateTime.TryParse(data.Date, out var parsedDate))
            {
                timestampUtc = DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc);
            }

            return new ExchangeRateResult(
                true,
                data.Base.ToUpperInvariant(),
                data.Rates,
                timestampUtc,
                null);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or InvalidOperationException)
        {
            logger.LogWarning(ex, "Frankfurter GetRatesAsync failed for base {BaseCurrency}", baseCurrency);
            return new ExchangeRateResult(false, baseCurrency.ToUpperInvariant(), new(), DateTime.UtcNow, ex.Message);
        }
    }

    public async Task<decimal?> GetRateAsync(
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
            return 1m;
        }

        try
        {
            var from = Uri.EscapeDataString(fromCurrency.ToUpperInvariant());
            var to = Uri.EscapeDataString(toCurrency.ToUpperInvariant());
            var response = await _httpClient.GetAsync($"{BaseUrl}/latest?base={from}&symbols={to}", cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var data = await response.Content.ReadFromJsonAsync<FrankfurterResponse>(cancellationToken: cancellationToken);
            if (data?.Rates == null)
            {
                return null;
            }

            return data.Rates.GetValueOrDefault(toCurrency.ToUpperInvariant());
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or InvalidOperationException)
        {
            logger.LogWarning(ex, "Frankfurter GetRateAsync failed for {From}->{To}", fromCurrency, toCurrency);
            return null;
        }
    }

    private record FrankfurterResponse(
        string Base,
        string Date,
        Dictionary<string, decimal> Rates);
}

