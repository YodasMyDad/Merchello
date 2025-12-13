using Merchello.Core.ExchangeRates.Models;

namespace Merchello.Core.ExchangeRates.Services;

public interface IExchangeRateCache
{
    Task<decimal?> GetRateAsync(
        string fromCurrency,
        string toCurrency,
        CancellationToken cancellationToken = default);

    Task<ExchangeRateQuote?> GetRateQuoteAsync(
        string fromCurrency,
        string toCurrency,
        CancellationToken cancellationToken = default);

    Task<ExchangeRateSnapshot?> GetSnapshotAsync(CancellationToken cancellationToken = default);

    Task SetSnapshotAsync(ExchangeRateSnapshot snapshot, CancellationToken cancellationToken = default);

    Task<bool> RefreshAsync(CancellationToken cancellationToken = default);

    Task InvalidateAsync(CancellationToken cancellationToken = default);
}

