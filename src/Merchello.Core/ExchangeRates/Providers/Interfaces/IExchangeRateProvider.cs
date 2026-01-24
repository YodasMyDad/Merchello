using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.Shared.Providers;

namespace Merchello.Core.ExchangeRates.Providers.Interfaces;

public interface IExchangeRateProvider
{
    ExchangeRateProviderMetadata Metadata { get; }

    ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
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

