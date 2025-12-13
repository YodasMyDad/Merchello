namespace Merchello.Core.ExchangeRates.Models;

public class ExchangeRateOptions
{
    public int CacheTtlMinutes { get; set; } = 60;
    public int RefreshIntervalMinutes { get; set; } = 60;
}

