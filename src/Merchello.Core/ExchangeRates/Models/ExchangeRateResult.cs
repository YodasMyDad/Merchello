namespace Merchello.Core.ExchangeRates.Models;

public record ExchangeRateResult(
    bool Success,
    string BaseCurrency,
    Dictionary<string, decimal> Rates,
    DateTime TimestampUtc,
    string? ErrorMessage);

