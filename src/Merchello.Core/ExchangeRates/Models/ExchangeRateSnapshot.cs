namespace Merchello.Core.ExchangeRates.Models;

public record ExchangeRateSnapshot(
    string ProviderAlias,
    string BaseCurrency,
    Dictionary<string, decimal> Rates,
    DateTime TimestampUtc);

