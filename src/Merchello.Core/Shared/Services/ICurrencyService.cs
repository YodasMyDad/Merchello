namespace Merchello.Core.Shared.Services;

public interface ICurrencyService
{
    CurrencyInfo GetCurrency(string currencyCode);
    string FormatAmount(decimal amount, string currencyCode);
    decimal Round(decimal amount, string currencyCode);
    int GetDecimalPlaces(string currencyCode);
    long ToMinorUnits(decimal amount, string currencyCode);
    decimal FromMinorUnits(long minorUnits, string currencyCode);
}

public record CurrencyInfo(
    string Code,
    string Symbol,
    int DecimalPlaces,
    bool SymbolBefore
);

