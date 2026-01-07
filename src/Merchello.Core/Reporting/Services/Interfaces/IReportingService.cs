using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Products.Models;
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
    /// Gets daily sales data with aggregated totals and percent change.
    /// Use this instead of GetSalesTimeSeriesAsync to avoid frontend calculations.
    /// </summary>
    Task<TimeSeriesResultDto> GetSalesTimeSeriesWithTotalsAsync(
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
    /// Gets daily average order value data with aggregated totals and percent change.
    /// Use this instead of GetAverageOrderValueTimeSeriesAsync to avoid frontend calculations.
    /// </summary>
    Task<TimeSeriesResultDto> GetAverageOrderValueTimeSeriesWithTotalsAsync(
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

    /// <summary>
    /// Gets the best-selling products based on order line item quantities.
    /// </summary>
    /// <param name="take">Maximum number of products to return.</param>
    /// <param name="fromDate">Optional start date for sales calculation.</param>
    /// <param name="toDate">Optional end date for sales calculation.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of products ordered by total quantity sold (descending).</returns>
    Task<List<Product>> GetBestSellersAsync(
        int take = 8,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets order statistics for today (orders, items, fulfilled, outstanding).
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Today's order statistics.</returns>
    Task<OrderStatsDto> GetOrderStatsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets dashboard statistics with monthly metrics and percentage changes.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Dashboard statistics with comparisons.</returns>
    Task<DashboardStatsDto> GetDashboardStatsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets orders for export within a date range.
    /// </summary>
    /// <param name="fromDate">Start date (inclusive).</param>
    /// <param name="toDate">End date (inclusive).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of order export items for CSV generation.</returns>
    Task<List<OrderExportItemDto>> GetOrdersForExportAsync(
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default);
}
