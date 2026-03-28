# Creating Custom Exchange Rate Providers

Exchange rate providers fetch currency conversion rates for Merchello's multi-currency support. Merchello ships with a built-in Frankfurter provider (free ECB rates), but you can create your own for premium services like Open Exchange Rates, Fixer.io, or XE.

## Quick Overview

To create an exchange rate provider, you need to:

1. Create a class that implements `IExchangeRateProvider`
2. Implement `Metadata`, `GetRatesAsync()`, and `GetRateAsync()`

There is no base class for exchange rate providers -- you implement the interface directly.

## How Exchange Rates Work in Merchello

A few important points about multi-currency:

- Basket amounts are stored in the **store currency** and never change when the display currency changes
- Display amounts are calculated on-the-fly: `amount * rate`
- Rates are cached by the exchange rate service to avoid hammering your provider
- At invoice creation, the rate is locked for audit (`PricingExchangeRate`, `PricingExchangeRateSource`, `PricingExchangeRateTimestampUtc`)

## Full Example

```csharp
using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.ExchangeRates.Providers;
using Merchello.Core.ExchangeRates.Providers.Interfaces;
using Merchello.Core.Shared.Providers;
using Microsoft.Extensions.Logging;

public class AcmeExchangeRateProvider(
    IHttpClientFactory httpClientFactory,
    ILogger<AcmeExchangeRateProvider> logger) : IExchangeRateProvider
{
    private ExchangeRateProviderConfiguration? _configuration;
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    // 1. Metadata
    public ExchangeRateProviderMetadata Metadata => new(
        Alias: "acme-rates",                    // Unique, immutable
        DisplayName: "Acme Exchange Rates",
        Icon: "icon-globe",
        Description: "Premium exchange rates from Acme Financial",
        SupportsHistoricalRates: false,
        SupportedCurrencies: []                  // Empty = all currencies
    );

    // 2. Configuration fields (if you need API keys)
    public ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
        [
            new ProviderConfigurationField
            {
                Key = "apiKey",
                Label = "API Key",
                FieldType = ConfigurationFieldType.Password,
                IsRequired = true,
                IsSensitive = true,
                Placeholder = "your-api-key"
            }
        ]);
    }

    // 3. Store configuration
    public ValueTask ConfigureAsync(
        ExchangeRateProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        _configuration = configuration;
        return ValueTask.CompletedTask;
    }

    // 4. Fetch ALL rates for a base currency
    public async Task<ExchangeRateResult> GetRatesAsync(
        string baseCurrency,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(baseCurrency))
            return new ExchangeRateResult(false, "", new(), DateTime.UtcNow, "Base currency is required.");

        try
        {
            var apiKey = _configuration?.GetValue("apiKey") ?? "";
            var response = await _httpClient.GetAsync(
                $"https://api.acme.com/rates?base={baseCurrency}&apikey={apiKey}",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
                return new ExchangeRateResult(false, baseCurrency, new(), DateTime.UtcNow,
                    $"API returned {response.StatusCode}");

            var data = await response.Content.ReadFromJsonAsync<AcmeRatesResponse>(
                cancellationToken: cancellationToken);

            // Return a dictionary of currency code -> rate
            // Rate is "1 base = X target" (e.g., 1 USD = 0.79 GBP)
            return new ExchangeRateResult(
                Success: true,
                BaseCurrency: baseCurrency.ToUpperInvariant(),
                Rates: data!.Rates,                // Dictionary<string, decimal>
                TimestampUtc: DateTime.UtcNow,
                ErrorMessage: null
            );
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Failed to fetch rates for {Base}", baseCurrency);
            return new ExchangeRateResult(false, baseCurrency, new(), DateTime.UtcNow, ex.Message);
        }
    }

    // 5. Fetch a SINGLE rate between two currencies
    public async Task<decimal?> GetRateAsync(
        string fromCurrency,
        string toCurrency,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fromCurrency) || string.IsNullOrWhiteSpace(toCurrency))
            return null;

        // Same currency = 1:1
        if (string.Equals(fromCurrency, toCurrency, StringComparison.OrdinalIgnoreCase))
            return 1m;

        try
        {
            var apiKey = _configuration?.GetValue("apiKey") ?? "";
            var response = await _httpClient.GetAsync(
                $"https://api.acme.com/rate?from={fromCurrency}&to={toCurrency}&apikey={apiKey}",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
                return null;

            var data = await response.Content.ReadFromJsonAsync<AcmeSingleRateResponse>(
                cancellationToken: cancellationToken);

            return data?.Rate;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Failed to fetch rate {From}->{To}", fromCurrency, toCurrency);
            return null;
        }
    }
}
```

## Key Points

### ExchangeRateResult

The `ExchangeRateResult` is a record with these fields:

```csharp
public record ExchangeRateResult(
    bool Success,
    string BaseCurrency,
    Dictionary<string, decimal> Rates,   // Currency code -> rate
    DateTime TimestampUtc,
    string? ErrorMessage
);
```

### Rate Direction

Rates should be expressed as "1 unit of base currency = X units of target currency":

- Base: USD, Target: GBP, Rate: 0.79 means $1 = 0.79 GBP
- Base: GBP, Target: USD, Rate: 1.27 means 1 GBP = $1.27

### Error Handling

Return a failed `ExchangeRateResult` rather than throwing exceptions. The exchange rate service handles retries and fallbacks.

### Provider Manager

Exchange rate providers are managed by `IExchangeRateProviderManager`, which handles:

- Listing all discovered providers
- Setting the active provider
- Saving provider settings

Only one exchange rate provider can be active at a time.

## No Configuration Needed?

If your provider doesn't need API keys (like the built-in Frankfurter provider), just return empty configuration:

```csharp
public ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
    CancellationToken cancellationToken = default)
    => ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>([]);

public ValueTask ConfigureAsync(
    ExchangeRateProviderConfiguration? configuration,
    CancellationToken cancellationToken = default)
    => ValueTask.CompletedTask;
```

## Built-in Provider for Reference

| Provider | Location | Notes |
|---|---|---|
| Frankfurter | `ExchangeRates/Providers/FrankfurterExchangeRateProvider.cs` | Free ECB rates, no API key needed |
