using Merchello.Core.Shared.Providers;

namespace Merchello.Core.ExchangeRates.Models;

public class ExchangeRateProviderSetting : ProviderConfiguration
{
    public DateTime? LastFetchedAt { get; set; }

    /// <summary>
    /// JSON snapshot of last successful rates for fallback when cache/provider is unavailable.
    /// </summary>
    public string? LastRatesJson { get; set; }
}
