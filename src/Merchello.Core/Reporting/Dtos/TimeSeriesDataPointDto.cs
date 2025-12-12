namespace Merchello.Core.Reporting.Dtos;

/// <summary>
/// A single data point in a time series chart.
/// </summary>
public record TimeSeriesDataPointDto(
    DateTime Date,
    decimal Value,
    decimal? ComparisonValue
);
