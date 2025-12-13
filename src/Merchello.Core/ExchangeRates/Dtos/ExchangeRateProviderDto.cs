namespace Merchello.Core.ExchangeRates.Dtos;

/// <summary>
/// Exchange rate provider with metadata and active status
/// </summary>
public class ExchangeRateProviderDto
{
    public required string Alias { get; set; }
    public required string DisplayName { get; set; }
    public string? Icon { get; set; }
    public string? Description { get; set; }
    public bool SupportsHistoricalRates { get; set; }
    public string[] SupportedCurrencies { get; set; } = [];

    /// <summary>
    /// Whether this provider is the active exchange rate provider
    /// (only one provider can be active at a time)
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// When rates were last fetched from this provider
    /// </summary>
    public DateTime? LastFetchedAt { get; set; }

    /// <summary>
    /// Provider configuration (API keys, etc.) - sensitive values masked
    /// </summary>
    public Dictionary<string, string>? Configuration { get; set; }
}
