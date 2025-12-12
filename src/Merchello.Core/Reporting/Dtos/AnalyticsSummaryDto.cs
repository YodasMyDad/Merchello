namespace Merchello.Core.Reporting.Dtos;

/// <summary>
/// Summary metrics for the analytics dashboard KPI cards.
/// </summary>
public record AnalyticsSummaryDto(
    decimal GrossSales,
    decimal GrossSalesChange,
    decimal ReturningCustomerRate,
    decimal ReturningCustomerRateChange,
    int OrdersFulfilled,
    decimal OrdersFulfilledChange,
    int TotalOrders,
    decimal TotalOrdersChange,
    List<decimal> GrossSalesSparkline,
    List<decimal> ReturningCustomerSparkline,
    List<decimal> OrdersFulfilledSparkline,
    List<decimal> TotalOrdersSparkline
);
