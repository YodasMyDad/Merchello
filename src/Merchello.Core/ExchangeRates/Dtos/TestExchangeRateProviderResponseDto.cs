namespace Merchello.Core.ExchangeRates.Dtos;

/// <summary>
/// Response from testing an exchange rate provider
/// </summary>
public class TestExchangeRateProviderResponseDto
{
    /// <summary>
    /// Whether the test was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if the test failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// The base currency used for the rate lookup
    /// </summary>
    public required string BaseCurrency { get; set; }

    /// <summary>
    /// Sample rates returned by the provider (currency code -> rate)
    /// Limited to common currencies for display purposes
    /// </summary>
    public Dictionary<string, decimal>? SampleRates { get; set; }

    /// <summary>
    /// Timestamp of the rates from the provider
    /// </summary>
    public DateTime? RateTimestamp { get; set; }

    /// <summary>
    /// Total number of rates available
    /// </summary>
    public int TotalRatesCount { get; set; }
}
