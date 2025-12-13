namespace Merchello.Core.ExchangeRates.Models;

public record ExchangeRateQuote(
    decimal Rate,
    DateTime TimestampUtc,
    string Source);

