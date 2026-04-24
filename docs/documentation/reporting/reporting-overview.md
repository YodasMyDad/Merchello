# Reporting and Analytics

Merchello provides a reporting system for tracking sales performance, understanding trends, and exporting data. All reporting data is served through [`IReportingService`](../../../src/Merchello.Core/Reporting/Services/Interfaces/IReportingService.cs) ([implementation](../../../src/Merchello.Core/Reporting/Services/ReportingService.cs)) and exposed via the backoffice API in [`ReportingApiController`](../../../src/Merchello/Controllers/ReportingApiController.cs).

## KPI Summary

The summary endpoint gives you the key metrics at a glance:

```
GET /api/v1/reporting/summary?startDate=2025-01-01&endDate=2025-01-31
```

Returns an `AnalyticsSummaryDto` with:

- **Gross sales** -- Total revenue before adjustments
- **Returning customers** -- Customers who have ordered before
- **Orders fulfilled** -- Completed orders in the period
- **Total orders** -- All orders in the period

### Period Comparison

Every summary endpoint supports comparison with a previous period. You can use automatic or custom comparison:

```
GET /api/v1/reporting/summary?startDate=2025-01-01&endDate=2025-01-31&compareMode=Previous
```

Compare modes:
- `Previous` -- Automatically compares with the preceding period of equal length
- `Custom` -- Provide explicit `comparisonStartDate` and `comparisonEndDate`

The response includes percentage changes for each metric.

## Sales Breakdown

Get a detailed breakdown of how your sales numbers are composed:

```
GET /api/v1/reporting/breakdown?startDate=2025-01-01&endDate=2025-01-31
```

Returns a `SalesBreakdownDto` with:

| Metric | Description |
|---|---|
| Gross sales | Total product revenue |
| Discounts | Total discount amounts applied |
| Returns | Refunded amounts |
| Net sales | Gross - discounts - returns |
| Shipping | Shipping charges collected |
| Taxes | Tax amounts collected |
| Total | Final total |

This also supports `compareMode` for period-over-period comparison.

## Time Series Data

Merchello provides daily time series data for charts and graphs.

### Sales Time Series

```
GET /api/v1/reporting/sales-timeseries?startDate=2025-01-01&endDate=2025-01-31
```

Returns a list of `TimeSeriesDataPointDto` with date and value for each day.

### Sales Time Series with Totals (Preferred)

```
GET /api/v1/reporting/sales-timeseries-with-totals?startDate=2025-01-01&endDate=2025-01-31
```

Returns a `TimeSeriesResultDto` that includes:
- Daily data points
- Period totals calculated on the backend
- Percentage change vs. comparison period

> **Tip:** Use the `-with-totals` endpoints whenever possible. They calculate totals and percentage changes on the backend so your frontend does not need to duplicate that math.

### Average Order Value Time Series

```
GET /api/v1/reporting/aov-timeseries-with-totals?startDate=2025-01-01&endDate=2025-01-31
```

Same structure as sales time series, but for average order value (AOV).

### Date Range Limit

Time series queries are limited to a maximum of 730 days (2 years) to prevent unbounded database queries. If you request a range exceeding this limit, the end date is automatically capped.

## Best Sellers

The reporting service can return your best-selling products (no dedicated API endpoint — consumed by the backoffice dashboard):

```csharp
var bestSellers = await reportingService.GetBestSellersAsync(
    take: 8,
    fromDate: DateTime.UtcNow.AddDays(-30),
    toDate: DateTime.UtcNow);
```

Products are ranked by total quantity sold (descending).

## Order Statistics

Quick stats for today's operations — exposed via the Orders API:

```
GET /api/v1/orders/stats
```

Returns `OrderStatsDto` with today's counts (`Orders`, `Items`, `Fulfilled`, `Outstanding`). Implementation: [OrdersApiController.GetOrderStats](../../../src/Merchello/Controllers/OrdersApiController.cs#L120).

## Dashboard Statistics

Monthly metrics with percentage changes for the main dashboard:

```
GET /api/v1/orders/dashboard-stats
```

Returns `DashboardStatsDto`. Implementation: [OrdersApiController.GetDashboardStats](../../../src/Merchello/Controllers/OrdersApiController.cs#L130).

## CSV Export

Export order data for a date range — exposed via the Orders API:

```
POST /api/v1/orders/export
Content-Type: application/json

{
  "fromDate": "2025-01-01T00:00:00Z",
  "toDate": "2025-01-31T23:59:59Z"
}
```

Returns a list of `OrderExportItemDto` records with all fields needed for a comprehensive CSV export (order number, customer, line items, totals). Implementation: [OrdersApiController.ExportOrders](../../../src/Merchello/Controllers/OrdersApiController.cs#L140).

## API Summary

Reporting endpoints live under `/api/v1/reporting` (see [ReportingApiController.cs](../../../src/Merchello/Controllers/ReportingApiController.cs)). Order stats / dashboard / export live under `/api/v1/orders`.

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/reporting/summary` | GET | KPI summary with comparison |
| `/api/v1/reporting/breakdown` | GET | Sales breakdown with comparison |
| `/api/v1/reporting/sales-timeseries` | GET | Daily sales data points |
| `/api/v1/reporting/sales-timeseries-with-totals` | GET | Sales data with calculated totals and comparison |
| `/api/v1/reporting/aov-timeseries` | GET | Daily average order value |
| `/api/v1/reporting/aov-timeseries-with-totals` | GET | AOV data with calculated totals and comparison |
| `/api/v1/orders/stats` | GET | Today's order stats |
| `/api/v1/orders/dashboard-stats` | GET | Monthly dashboard stats with percent change |
| `/api/v1/orders/export` | POST | Order export data for CSV generation |

## Related Topics

- [Orders](../orders/)
- [Background Jobs](../background-jobs/background-jobs.md)
- [Admin API](../api/admin-api.md)
