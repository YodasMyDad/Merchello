# Exchange Rate Providers

Merchello uses a pluggable provider system for fetching exchange rates. Out of the box, you get the **Frankfurter** provider which uses free European Central Bank rates. You can also build your own provider for premium rate sources.

## Provider Architecture

Exchange rate providers follow the same pattern as other Merchello providers:

1. Discovered automatically by `ExtensionManager` during startup
2. Configured through the backoffice with provider-specific settings
3. **Only one provider can be active at a time** (radio selection, not multi-select)

When you activate a provider, any previously active provider is automatically deactivated.

## Built-in: Frankfurter (ECB Rates)

**Alias:** `frankfurter`

The Frankfurter provider fetches rates from [frankfurter.dev](https://frankfurter.dev), which sources data from the European Central Bank. It is free, requires no API key, and supports all major currencies.

| Property | Value |
|----------|-------|
| Alias | `frankfurter` |
| Display Name | Frankfurter (ECB Rates) |
| API | `https://api.frankfurter.dev/v1` |
| Configuration | None required |
| Historical Rates | Supported |
| Rate Source | European Central Bank |

### How it fetches rates

```
GET https://api.frankfurter.dev/v1/latest?base=GBP
```

Returns all available rates with the specified base currency. The provider normalizes the response and returns an `ExchangeRateResult` with rates and a timestamp.

### Limitations

- Rates are updated once per business day (ECB publishes around 16:00 CET)
- Weekend rates use the last available Friday rate
- Some exotic currencies may not be available

## Exchange Rate Cache

Rates are not fetched on every request. Merchello uses a multi-layer cache:

### Cache flow

```
Request for rate
    ↓
1. In-memory cache (ICacheService)
    ↓ miss
2. Database snapshot
    ↓ miss
3. Provider API call
    ↓ success
   Store in DB + cache
```

### Cache configuration

```json
{
  "Merchello": {
    "ExchangeRates": {
      "CacheTtlMinutes": 60
    }
  }
}
```

The `CacheTtlMinutes` controls how long rates stay in the in-memory cache before being refreshed. The minimum is 1 minute.

### Cross-rate calculation

The cache stores rates from the store currency to all available currencies. When you need a rate between two non-store currencies (e.g., EUR to JPY when the store is GBP), the cache calculates a **cross rate**:

```
GBP -> EUR rate: 1.17
GBP -> JPY rate: 189.50

EUR -> JPY = 189.50 / 1.17 = 161.97
```

### Identity rate

If the source and target currency are the same, the cache returns `1.0` immediately without making any API call or cache lookup.

## Exchange Rate Refresh Job

A background job (`ExchangeRateRefreshJob`) periodically refreshes rates to keep the cache warm. This runs as an `IHostedService` and:

1. Fetches the latest rates from the active provider
2. Stores a snapshot in the database (for persistence across restarts)
3. Updates the in-memory cache

This means even if the provider API is temporarily unavailable, Merchello can fall back to the last stored snapshot.

## Database Snapshots

Exchange rate snapshots are persisted to the database with:

| Field | Description |
|-------|-------------|
| `BaseCurrency` | The base currency (store currency) |
| `Rates` | JSON dictionary of currency -> rate |
| `ProviderAlias` | Which provider produced the rates |
| `TimestampUtc` | When the rates were fetched |

Snapshots serve as the fallback when:
- The application restarts and the in-memory cache is empty
- The provider API is down
- Cross-rate calculations need consistent data

## Rate Quotes

When you request a rate, you get an `ExchangeRateQuote` containing:

| Property | Description |
|----------|-------------|
| `Rate` | The exchange rate |
| `TimestampUtc` | When the rate was fetched/cached |
| `ProviderAlias` | Which provider produced the rate |

This is what gets locked onto invoices at creation time (see [Multi-Currency Overview](multi-currency-overview.md)).

## Building a Custom Provider

To create your own exchange rate provider (e.g., for Open Exchange Rates, Fixer, or XE):

### 1. Implement `IExchangeRateProvider`

```csharp
public class OpenExchangeRatesProvider : IExchangeRateProvider
{
    public ExchangeRateProviderMetadata Metadata => new(
        Alias: "open-exchange-rates",
        DisplayName: "Open Exchange Rates",
        Icon: "icon-globe",
        Description: "Real-time rates from openexchangerates.org",
        SupportsHistoricalRates: true,
        SupportedCurrencies: []);

    public ValueTask<IEnumerable<ProviderConfigurationField>>
        GetConfigurationFieldsAsync(CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
        [
            new()
            {
                Key = "appId",
                Label = "App ID",
                FieldType = ConfigurationFieldType.Password,
                IsRequired = true,
                IsSensitive = true,
                Description = "Your Open Exchange Rates App ID"
            }
        ]);
    }

    public async Task<ExchangeRateResult> GetRatesAsync(
        string baseCurrency,
        CancellationToken ct = default)
    {
        // Call the API and return rates...
        var rates = new Dictionary<string, decimal>
        {
            ["EUR"] = 0.92m,
            ["GBP"] = 0.79m,
            // ...
        };

        return new ExchangeRateResult(
            success: true,
            baseCurrency: baseCurrency,
            rates: rates,
            timestampUtc: DateTime.UtcNow,
            error: null);
    }

    public async Task<decimal?> GetRateAsync(
        string fromCurrency,
        string toCurrency,
        CancellationToken ct = default)
    {
        var result = await GetRatesAsync(fromCurrency, ct);
        if (!result.Success) return null;
        return result.Rates.GetValueOrDefault(toCurrency.ToUpperInvariant());
    }

    // ConfigureAsync receives saved settings at startup
    public ValueTask ConfigureAsync(
        ExchangeRateProviderConfiguration? configuration,
        CancellationToken ct = default)
        => ValueTask.CompletedTask;
}
```

### 2. Package and install

Package your provider as a NuGet package referencing `Merchello.Core`. When the host application calls `builder.AddMerchello()`, your provider assembly is scanned and the provider appears in the backoffice settings.

### Key points for custom providers

- **Error handling**: Return `ExchangeRateResult` with `success: false` and an error message rather than throwing exceptions. The cache and refresh job handle failures gracefully.
- **Rate direction**: Return rates as "1 baseCurrency = X targetCurrency". For example, if base is USD and target is EUR, return 0.92 (1 USD = 0.92 EUR).
- **Sensitive fields**: Mark API keys with `IsSensitive = true` -- Merchello encrypts them at rest.
- **Metadata**: Set `SupportsHistoricalRates` and `SupportedCurrencies` accurately. An empty `SupportedCurrencies` array means all currencies are supported.

## Provider Manager

The `ExchangeRateProviderManager` handles:

| Operation | Description |
|-----------|-------------|
| `GetProvidersAsync()` | List all registered providers with their configuration |
| `GetActiveProviderAsync()` | Get the currently active provider |
| `SetActiveProviderAsync(alias)` | Activate a provider (deactivates others) |
| `SaveProviderSettingsAsync(alias, settings)` | Save provider configuration |

> **Tip:** If no provider is explicitly activated, the manager defaults to the Frankfurter provider when available. You don't need to configure anything for basic multi-currency support.
