namespace Merchello.Core.Shared.Models;

public record CurrencyInfo(
    string Code,
    string Symbol,
    int DecimalPlaces,
    bool SymbolBefore
);
