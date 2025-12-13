namespace Merchello.Core.ExchangeRates.Dtos;

/// <summary>
/// Current exchange rate snapshot from the cache
/// </summary>
public class ExchangeRateSnapshotDto
{
    /// <summary>
    /// The provider alias that generated this snapshot
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The base currency for all rates
    /// </summary>
    public required string BaseCurrency { get; set; }

    /// <summary>
    /// All available rates (currency code -> rate)
    /// </summary>
    public required Dictionary<string, decimal> Rates { get; set; }

    /// <summary>
    /// When the rates were fetched from the provider
    /// </summary>
    public DateTime TimestampUtc { get; set; }

    /// <summary>
    /// When the cache was last refreshed
    /// </summary>
    public DateTime? LastFetchedAt { get; set; }
}
