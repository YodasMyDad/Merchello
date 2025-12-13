namespace Merchello.Core.ExchangeRates.Models;

public record ExchangeRateProviderMetadata(
    string Alias,
    string DisplayName,
    string? Icon,
    string? Description,
    bool SupportsHistoricalRates,
    string[] SupportedCurrencies);

