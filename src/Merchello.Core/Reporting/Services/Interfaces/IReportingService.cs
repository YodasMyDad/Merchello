using Merchello.Core.Reporting.Dtos;

namespace Merchello.Core.Reporting.Services.Interfaces;

/// <summary>
/// Service for analytics and reporting queries.
/// </summary>
public interface IReportingService
{
    /// <summary>
    /// Gets summary metrics for KPI cards (gross sales, returning customers, orders fulfilled, total orders).
    /// </summary>
    Task<AnalyticsSummaryDto> GetAnalyticsSummaryAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets daily sales data for the time series chart.
    /// </summary>
    Task<List<TimeSeriesDataPointDto>> GetSalesTimeSeriesAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets daily average order value data for the time series chart.
    /// </summary>
    Task<List<TimeSeriesDataPointDto>> GetAverageOrderValueTimeSeriesAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the sales breakdown (gross, discounts, returns, net, shipping, taxes, total).
    /// </summary>
    Task<SalesBreakdownDto> GetSalesBreakdownAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default);
}
