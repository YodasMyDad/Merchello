namespace Merchello.Core.Reporting.Dtos;

/// <summary>
/// Result DTO for time series chart data including aggregated values.
/// All calculations are performed server-side to avoid frontend logic duplication.
/// </summary>
public record TimeSeriesResultDto(
    /// <summary>
    /// Individual data points for the time series chart.
    /// </summary>
    List<TimeSeriesDataPointDto> DataPoints,

    /// <summary>
    /// Total value for the current period (sum of all data point values).
    /// Calculated by backend to avoid frontend aggregation.
    /// </summary>
    decimal PeriodTotal,

    /// <summary>
    /// Total value for the comparison period (sum of all comparison values).
    /// Calculated by backend to avoid frontend aggregation.
    /// </summary>
    decimal? ComparisonTotal,

    /// <summary>
    /// Percentage change from comparison period to current period.
    /// Calculated by backend using consistent methodology.
    /// Positive = increase, Negative = decrease.
    /// </summary>
    decimal? PercentChange
);
