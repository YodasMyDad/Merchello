namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// DTO for abandoned checkout statistics and analytics.
/// </summary>
public class AbandonedCheckoutStatsDto
{
    /// <summary>
    /// Total number of abandoned checkouts in the period.
    /// </summary>
    public int TotalAbandoned { get; set; }

    /// <summary>
    /// Number of checkouts that were recovered (customer returned).
    /// </summary>
    public int TotalRecovered { get; set; }

    /// <summary>
    /// Number of recovered checkouts that converted to orders.
    /// </summary>
    public int TotalConverted { get; set; }

    /// <summary>
    /// Recovery rate as a percentage (Recovered / Abandoned).
    /// </summary>
    public decimal RecoveryRate { get; set; }

    /// <summary>
    /// Conversion rate as a percentage (Converted / Abandoned).
    /// </summary>
    public decimal ConversionRate { get; set; }

    /// <summary>
    /// Total value of all abandoned checkouts.
    /// </summary>
    public decimal TotalValueAbandoned { get; set; }

    /// <summary>
    /// Total value recovered (converted to orders).
    /// </summary>
    public decimal TotalValueRecovered { get; set; }

    /// <summary>
    /// Formatted total value abandoned with currency.
    /// </summary>
    public string FormattedValueAbandoned { get; set; } = string.Empty;

    /// <summary>
    /// Formatted total value recovered with currency.
    /// </summary>
    public string FormattedValueRecovered { get; set; } = string.Empty;

    /// <summary>
    /// Currency code for the statistics.
    /// </summary>
    public string? CurrencyCode { get; set; }

    /// <summary>
    /// Currency symbol for formatting.
    /// </summary>
    public string? CurrencySymbol { get; set; }
}
