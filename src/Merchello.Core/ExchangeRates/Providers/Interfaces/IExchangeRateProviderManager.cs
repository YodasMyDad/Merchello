namespace Merchello.Core.ExchangeRates.Providers.Interfaces;

public interface IExchangeRateProviderManager
{
    Task<IReadOnlyCollection<RegisteredExchangeRateProvider>> GetProvidersAsync(
        CancellationToken cancellationToken = default);

    Task<RegisteredExchangeRateProvider?> GetActiveProviderAsync(
        CancellationToken cancellationToken = default);

    Task<bool> SetActiveProviderAsync(
        string alias,
        CancellationToken cancellationToken = default);

    Task<bool> SaveProviderSettingsAsync(
        string alias,
        Dictionary<string, string> settings,
        CancellationToken cancellationToken = default);
}

