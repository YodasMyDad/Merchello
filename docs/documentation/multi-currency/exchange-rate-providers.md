# Exchange Rate Providers

Merchello uses a pluggable provider system for fetching exchange rates. Out of the box you get the **Frankfurter** provider (free European Central Bank rates). For premium or real-time rate sources you can build your own provider -- see [Creating Custom Exchange Rate Providers](../extending/creating-exchange-rate-providers.md).

## Provider Architecture

Exchange rate providers follow the same pattern as other Merchello providers (see [`IExchangeRateProvider.cs`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/ExchangeRates/Providers/Interfaces/IExchangeRateProvider.cs)):

1. Discovered automatically by `ExtensionManager` during startup.
2. Configured through the backoffice with provider-specific settings (`GetConfigurationFieldsAsync` + `ConfigureAsync`).
3. **Only one provider can be active at a time** -- radio selection, enforced by [`ExchangeRateProviderManager.SetActiveProviderAsync(...)`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/ExchangeRates/Providers/ExchangeRateProviderManager.cs#L149).

When you activate a provider, any previously active provider is automatically deactivated. If no provider is explicitly activated, the manager falls back to Frankfurter when it is present ([ExchangeRateProviderManager.cs:117](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/ExchangeRates/Providers/ExchangeRateProviderManager.cs#L117)).

## Built-in: Frankfurter (ECB Rates)

**Alias:** `frankfurter`  
**Source:** [`FrankfurterExchangeRateProvider.cs`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/ExchangeRates/Providers/FrankfurterExchangeRateProvider.cs)

The Frankfurter provider fetches rates from [frankfurter.dev](https://frankfurter.dev), which sources data from the European Central Bank. It is free, requires no API key and supports all major currencies.

| Property | Value |
|----------|-------|
| Alias | `frankfurter` |
| Display Name | Frankfurter (ECB Rates) |
| API | `https://api.frankfurter.dev/v1` |
| Configuration | None required |
| Historical Rates | Supported |
| Rate Source | European Central Bank |

### How it fetches rates

```http
GET https://api.frankfurter.dev/v1/latest?base=GBP
```

The provider normalizes the response and returns an [`ExchangeRateResult`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/ExchangeRates/Models/ExchangeRateResult.cs) containing the base currency, a `Dictionary<string, decimal>` of rates and a UTC timestamp.

### Limitations

- Rates are updated once per business day (ECB publishes around 16:00 CET)
- Weekend rates use the last available Friday rate
- Some exotic / pegged currencies may not be available

### When to pick something else

Consider building a custom provider ([guide](../extending/creating-exchange-rate-providers.md)) if you need:

- **Intraday / tick-level rates** for high-value B2B orders
- **Non-ECB coverage** (additional currencies or crypto)
- **SLAs and paid support** (Open Exchange Rates, Fixer, XE, etc.)
- **Custom markups** on mid-market rates before they reach the customer

## Exchange Rate Cache

Rates are not fetched on every request. Merchello uses a multi-layer cache via [`IExchangeRateCache`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/ExchangeRates/Services/Interfaces/IExchangeRateCache.cs):

### Cache flow

```
Request for rate
    |
 1. In-memory cache (ICacheService)
    | miss
 2. Database snapshot
    | miss
 3. Provider API call
    | success
    v
 Store in DB + cache
```

### Cache configuration

Configured via [`ExchangeRateOptions`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/ExchangeRates/Models/ExchangeRateOptions.cs) bound from `appsettings.json`:

```json
{
  "Merchello": {
    "ExchangeRates": {
      "CacheTtlMinutes": 60,
      "RefreshIntervalMinutes": 60
    }
  }
}
```

| Key | Default | Description |
|-----|---------|-------------|
| `CacheTtlMinutes` | 60 | How long rates stay in the in-memory cache before being refreshed |
| `RefreshIntervalMinutes` | 60 | How often the background refresh job runs |

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

When you request a rate via `IExchangeRateCache.GetRateQuoteAsync(...)`, you get an [`ExchangeRateQuote`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/ExchangeRates/Models/ExchangeRateQuote.cs) containing:

| Property | Description |
|----------|-------------|
| `Rate` | The exchange rate (presentment-to-store) |
| `TimestampUtc` | When the rate was fetched/cached |
| `Source` | Provider alias that produced the rate (e.g. `"frankfurter"`) |

This is the exact shape that gets locked onto invoices at creation time:

- `invoice.PricingExchangeRate = quote.Rate`
- `invoice.PricingExchangeRateSource = quote.Source`
- `invoice.PricingExchangeRateTimestampUtc = quote.TimestampUtc`

See [Multi-Currency Overview](multi-currency-overview.md#rate-locking-at-invoice-creation) for the full lock flow.

## Building a Custom Provider

See the full walkthrough in [Creating Custom Exchange Rate Providers](../extending/creating-exchange-rate-providers.md). The condensed version:

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
        // Call the API and build a dictionary of target -> rate
        var rates = new Dictionary<string, decimal>
        {
            ["EUR"] = 0.92m,
            ["GBP"] = 0.79m,
            // ...
        };

        return new ExchangeRateResult(
            Success: true,
            BaseCurrency: baseCurrency.ToUpperInvariant(),
            Rates: rates,
            TimestampUtc: DateTime.UtcNow,
            ErrorMessage: null);
    }

    public async Task<decimal?> GetRateAsync(
        string fromCurrency,
        string toCurrency,
        CancellationToken ct = default)
    {
        if (string.Equals(fromCurrency, toCurrency, StringComparison.OrdinalIgnoreCase))
            return 1m;

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

- **Identity rate short-circuit**: if `fromCurrency == toCurrency`, return `1m` before doing anything else.
- **Error handling**: return `ExchangeRateResult(Success: false, ..., ErrorMessage: "...")` rather than throwing. The cache and [refresh job](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/ExchangeRates/Services/ExchangeRateRefreshJob.cs) handle failures gracefully and fall back to the last stored snapshot.
- **Rate direction**: return rates as "1 baseCurrency = X targetCurrency". If base is USD and target is EUR, return `0.92` (1 USD = 0.92 EUR). The cache inverts / cross-computes as needed.
- **Sensitive fields**: mark API keys with `IsSensitive = true` -- Merchello encrypts them at rest.
- **Metadata**: set `SupportsHistoricalRates` and `SupportedCurrencies` accurately. An empty `SupportedCurrencies` array means all currencies are supported.

## Provider Manager

The `ExchangeRateProviderManager` handles:

| Operation | Description |
|-----------|-------------|
| `GetProvidersAsync()` | List all registered providers with their configuration |
| `GetActiveProviderAsync()` | Get the currently active provider |
| `SetActiveProviderAsync(alias)` | Activate a provider (deactivates others) |
| `SaveProviderSettingsAsync(alias, settings)` | Save provider configuration |

> **Tip:** If no provider is explicitly activated, the manager defaults to the Frankfurter provider when available. You don't need to configure anything for basic multi-currency support.
