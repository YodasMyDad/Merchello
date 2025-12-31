using Merchello.Core.ExchangeRates.Models;

namespace Merchello.Core.ExchangeRates.Providers.Interfaces;

public interface IExchangeRateProvider
{
    ExchangeRateProviderMetadata Metadata { get; }

    ValueTask<IEnumerable<ExchangeRateProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default);

    ValueTask ConfigureAsync(
        ExchangeRateProviderConfiguration? configuration,
        CancellationToken cancellationToken = default);

    Task<ExchangeRateResult> GetRatesAsync(
        string baseCurrency,
        CancellationToken cancellationToken = default);

    Task<decimal?> GetRateAsync(
        string fromCurrency,
        string toCurrency,
        CancellationToken cancellationToken = default);
}

