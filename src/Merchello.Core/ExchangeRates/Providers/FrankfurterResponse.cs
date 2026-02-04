namespace Merchello.Core.ExchangeRates.Providers;

internal sealed record FrankfurterResponse(
    string Base,
    string Date,
    Dictionary<string, decimal> Rates);
