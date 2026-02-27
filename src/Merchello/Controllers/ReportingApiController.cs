using Asp.Versioning;
using Merchello.Core.Reporting.Dtos;
using Merchello.Core.Reporting.Services.Interfaces;
using Merchello.Core.Reporting.Services.Parameters;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class ReportingApiController(
    IReportingService reportingService) : MerchelloApiControllerBase
{
    /// <summary>
    /// Get analytics summary for KPI cards (gross sales, returning customers, orders fulfilled, total orders)
    /// </summary>
    [HttpGet("reporting/summary")]
    [ProducesResponseType<AnalyticsSummaryDto>(StatusCodes.Status200OK)]
    public async Task<AnalyticsSummaryDto> GetSummary(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] CompareMode compareMode = CompareMode.Previous,
        [FromQuery] DateTime? comparisonStartDate = null,
        [FromQuery] DateTime? comparisonEndDate = null,
        CancellationToken cancellationToken = default)
    {
        return await reportingService.GetAnalyticsSummaryAsync(new AnalyticsQueryParameters
        {
            StartDate = startDate,
            EndDate = endDate,
            CompareMode = compareMode,
            ComparisonStartDate = comparisonStartDate,
            ComparisonEndDate = comparisonEndDate,
        }, cancellationToken);
    }

    /// <summary>
    /// Get daily sales time series data for the chart
    /// </summary>
    [HttpGet("reporting/sales-timeseries")]
    [ProducesResponseType<List<TimeSeriesDataPointDto>>(StatusCodes.Status200OK)]
    public async Task<List<TimeSeriesDataPointDto>> GetSalesTimeSeries(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        // Enforce maximum date range of 2 years to prevent unbounded queries
        if ((endDate - startDate).TotalDays > 730)
            endDate = startDate.AddDays(730);

        return await reportingService.GetSalesTimeSeriesAsync(startDate, endDate, cancellationToken);
    }

    /// <summary>
    /// Get daily average order value time series data for the chart
    /// </summary>
    [HttpGet("reporting/aov-timeseries")]
    [ProducesResponseType<List<TimeSeriesDataPointDto>>(StatusCodes.Status200OK)]
    public async Task<List<TimeSeriesDataPointDto>> GetAovTimeSeries(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        // Enforce maximum date range of 2 years to prevent unbounded queries
        if ((endDate - startDate).TotalDays > 730)
            endDate = startDate.AddDays(730);

        return await reportingService.GetAverageOrderValueTimeSeriesAsync(startDate, endDate, cancellationToken);
    }

    /// <summary>
    /// Get sales breakdown (gross, discounts, returns, net, shipping, taxes, total)
    /// </summary>
    [HttpGet("reporting/breakdown")]
    [ProducesResponseType<SalesBreakdownDto>(StatusCodes.Status200OK)]
    public async Task<SalesBreakdownDto> GetBreakdown(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] CompareMode compareMode = CompareMode.Previous,
        [FromQuery] DateTime? comparisonStartDate = null,
        [FromQuery] DateTime? comparisonEndDate = null,
        CancellationToken cancellationToken = default)
    {
        return await reportingService.GetSalesBreakdownAsync(new AnalyticsQueryParameters
        {
            StartDate = startDate,
            EndDate = endDate,
            CompareMode = compareMode,
            ComparisonStartDate = comparisonStartDate,
            ComparisonEndDate = comparisonEndDate,
        }, cancellationToken);
    }

    /// <summary>
    /// Get daily sales time series data with period totals and percent change.
    /// This is the preferred endpoint - includes backend-calculated totals.
    /// </summary>
    [HttpGet("reporting/sales-timeseries-with-totals")]
    [ProducesResponseType<TimeSeriesResultDto>(StatusCodes.Status200OK)]
    public async Task<TimeSeriesResultDto> GetSalesTimeSeriesWithTotals(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] CompareMode compareMode = CompareMode.Previous,
        [FromQuery] DateTime? comparisonStartDate = null,
        [FromQuery] DateTime? comparisonEndDate = null,
        CancellationToken cancellationToken = default)
    {
        return await reportingService.GetSalesTimeSeriesWithTotalsAsync(new AnalyticsQueryParameters
        {
            StartDate = startDate,
            EndDate = endDate,
            CompareMode = compareMode,
            ComparisonStartDate = comparisonStartDate,
            ComparisonEndDate = comparisonEndDate,
        }, cancellationToken);
    }

    /// <summary>
    /// Get daily average order value time series data with period totals and percent change.
    /// This is the preferred endpoint - includes backend-calculated totals.
    /// </summary>
    [HttpGet("reporting/aov-timeseries-with-totals")]
    [ProducesResponseType<TimeSeriesResultDto>(StatusCodes.Status200OK)]
    public async Task<TimeSeriesResultDto> GetAovTimeSeriesWithTotals(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] CompareMode compareMode = CompareMode.Previous,
        [FromQuery] DateTime? comparisonStartDate = null,
        [FromQuery] DateTime? comparisonEndDate = null,
        CancellationToken cancellationToken = default)
    {
        return await reportingService.GetAverageOrderValueTimeSeriesWithTotalsAsync(new AnalyticsQueryParameters
        {
            StartDate = startDate,
            EndDate = endDate,
            CompareMode = compareMode,
            ComparisonStartDate = comparisonStartDate,
            ComparisonEndDate = comparisonEndDate,
        }, cancellationToken);
    }
}
