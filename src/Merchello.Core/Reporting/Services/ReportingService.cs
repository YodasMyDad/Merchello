using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Products.Models;
using Merchello.Core.Reporting.Dtos;
using Merchello.Core.Reporting.Models;
using Merchello.Core.Reporting.Services.Interfaces;
using Merchello.Core.Reporting.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Reporting.Services;

public class ReportingService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IPaymentService paymentService,
    ICurrencyService currencyService,
    IOptions<MerchelloSettings> settings) : IReportingService
{
    private readonly MerchelloSettings _settings = settings.Value;

    public Task<AnalyticsSummaryDto> GetAnalyticsSummaryAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
        => GetAnalyticsSummaryAsync(new AnalyticsQueryParameters
        {
            StartDate = startDate,
            EndDate = endDate
        }, cancellationToken);

    public async Task<AnalyticsSummaryDto> GetAnalyticsSummaryAsync(
        AnalyticsQueryParameters parameters,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        return await scope.ExecuteWithContextAsync(async db =>
        {
            var start = parameters.StartDate.Date;
            var end = parameters.EndDate.Date.AddDays(1).AddTicks(-1);
            var comparisonRange = ResolveComparisonRange(start, end, parameters);

            // Current period invoices
            var currentInvoices = await db.Invoices
                .Where(i => !i.IsDeleted && i.DateCreated >= start && i.DateCreated <= end)
                .Select(i => new InvoiceSummary(i.Id, i.SubTotalInStoreCurrency ?? i.SubTotal, i.DateCreated, i.BillingAddress.Email))
                .ToListAsync(cancellationToken);

            // Calculate current metrics
            var grossSales = currentInvoices.Sum(i => i.SubTotal);
            var totalOrders = currentInvoices.Count;
            var currentOrdersFulfilled = await db.Orders
                .Where(o => o.Invoice != null && !o.Invoice.IsDeleted
                    && o.CompletedDate >= start && o.CompletedDate <= end
                    && o.Status == OrderStatus.Completed)
                .CountAsync(cancellationToken);

            // Comparison metrics (only when comparison is enabled)
            decimal grossSalesChange = 0;
            decimal totalOrdersChange = 0;
            decimal ordersFulfilledChange = 0;
            decimal returningRate = 0;
            decimal returningRateChange = 0;

            if (comparisonRange is { } comp)
            {
                var comparisonInvoices = await db.Invoices
                    .Where(i => !i.IsDeleted && i.DateCreated >= comp.comparisonStart && i.DateCreated <= comp.comparisonEnd)
                    .Select(i => new InvoiceSummary(i.Id, i.SubTotalInStoreCurrency ?? i.SubTotal, i.DateCreated, i.BillingAddress.Email))
                    .ToListAsync(cancellationToken);

                var comparisonOrdersFulfilled = await db.Orders
                    .Where(o => o.Invoice != null && !o.Invoice.IsDeleted
                        && o.CompletedDate >= comp.comparisonStart && o.CompletedDate <= comp.comparisonEnd
                        && o.Status == OrderStatus.Completed)
                    .CountAsync(cancellationToken);

                var comparisonGrossSales = comparisonInvoices.Sum(i => i.SubTotal);
                var comparisonTotalOrders = comparisonInvoices.Count;

                (returningRate, var comparisonReturningRate) = await CalculateReturningCustomerRateAsync(
                    db, currentInvoices, comparisonInvoices, start, comp.comparisonStart, cancellationToken);

                grossSalesChange = CalculatePercentChange(grossSales, comparisonGrossSales);
                totalOrdersChange = CalculatePercentChange(totalOrders, comparisonTotalOrders);
                ordersFulfilledChange = CalculatePercentChange(currentOrdersFulfilled, comparisonOrdersFulfilled);
                returningRateChange = CalculatePercentChange(returningRate, comparisonReturningRate);
            }
            else
            {
                // Still calculate returning rate for current period display (without comparison)
                var currentEmails = currentInvoices
                    .Select(i => i.Email)
                    .Where(e => !string.IsNullOrEmpty(e))
                    .Distinct()
                    .ToList();

                if (currentEmails.Count > 0)
                {
                    var returningCount = await db.Invoices
                        .Where(i => !i.IsDeleted && i.DateCreated < start)
                        .Where(i => currentEmails.Contains(i.BillingAddress.Email))
                        .Select(i => i.BillingAddress.Email)
                        .Distinct()
                        .CountAsync(cancellationToken);

                    returningRate = Math.Round((decimal)returningCount / currentEmails.Count * 100, 1);
                }
            }

            // Sparkline data - daily values for the period
            var grossSalesSparkline = GetDailySparklineData(currentInvoices, start, end, i => i.SubTotal);
            var totalOrdersSparkline = GetDailySparklineData(currentInvoices, start, end, _ => 1m);

            // Orders fulfilled sparkline - fetch raw data and group in memory (SQLite compatibility)
            var fulfilledOrders = await db.Orders
                .Where(o => o.Invoice != null && !o.Invoice.IsDeleted
                    && o.CompletedDate >= start && o.CompletedDate <= end
                    && o.Status == OrderStatus.Completed)
                .Select(o => o.CompletedDate!.Value.Date)
                .ToListAsync(cancellationToken);

            var fulfilledByDay = fulfilledOrders
                .GroupBy(d => d)
                .ToDictionary(g => g.Key, g => g.Count());

            List<decimal> ordersFulfilledSparkline = [];
            for (var date = start; date <= end; date = date.AddDays(1))
            {
                var count = fulfilledByDay.GetValueOrDefault(date, 0);
                ordersFulfilledSparkline.Add(count);
            }

            var returningCustomerSparkline = grossSalesSparkline.Select(v => v > 0 ? 1m : 0m).ToList();

            return new AnalyticsSummaryDto(
                GrossSales: grossSales,
                GrossSalesChange: grossSalesChange,
                ReturningCustomerRate: returningRate,
                ReturningCustomerRateChange: returningRateChange,
                OrdersFulfilled: currentOrdersFulfilled,
                OrdersFulfilledChange: ordersFulfilledChange,
                TotalOrders: totalOrders,
                TotalOrdersChange: totalOrdersChange,
                GrossSalesSparkline: grossSalesSparkline,
                ReturningCustomerSparkline: returningCustomerSparkline,
                OrdersFulfilledSparkline: ordersFulfilledSparkline,
                TotalOrdersSparkline: totalOrdersSparkline
            );
        });
    }

    public async Task<List<TimeSeriesDataPointDto>> GetSalesTimeSeriesAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);
        var periodLength = (endDate - startDate).Days + 1;
        var comparisonRange = ((DateTime, DateTime)?)(start.AddDays(-periodLength), start.AddTicks(-1));

        return await GetInvoiceTimeSeriesAsync(start, end, comparisonRange, totals => totals.Sum(), cancellationToken);
    }

    public async Task<List<TimeSeriesDataPointDto>> GetAverageOrderValueTimeSeriesAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);
        var periodLength = (endDate - startDate).Days + 1;
        var comparisonRange = ((DateTime, DateTime)?)(start.AddDays(-periodLength), start.AddTicks(-1));

        return await GetInvoiceTimeSeriesAsync(start, end, comparisonRange, totals => totals.Count == 0 ? 0 : totals.Average(), cancellationToken);
    }

    private async Task<List<TimeSeriesDataPointDto>> GetInvoiceTimeSeriesAsync(
        DateTime start,
        DateTime end,
        (DateTime comparisonStart, DateTime comparisonEnd)? comparisonRange,
        Func<IReadOnlyList<decimal>, decimal> aggregate,
        CancellationToken cancellationToken)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        return await scope.ExecuteWithContextAsync(async db =>
        {
            // Fetch raw data first (SQLite doesn't support GroupBy + aggregate in SQL)
            var currentInvoices = await db.Invoices
                .Where(i => !i.IsDeleted && i.DateCreated >= start && i.DateCreated <= end)
                .Select(i => new { i.DateCreated, Total = i.TotalInStoreCurrency ?? i.Total })
                .ToListAsync(cancellationToken);

            var currentData = currentInvoices
                .GroupBy(i => i.DateCreated.Date)
                .ToDictionary(g => g.Key, g => aggregate(g.Select(i => i.Total).ToList()));

            Dictionary<DateTime, decimal>? comparisonData = null;
            if (comparisonRange is { } comp)
            {
                var comparisonInvoices = await db.Invoices
                    .Where(i => !i.IsDeleted && i.DateCreated >= comp.comparisonStart && i.DateCreated <= comp.comparisonEnd)
                    .Select(i => new { i.DateCreated, Total = i.TotalInStoreCurrency ?? i.Total })
                    .ToListAsync(cancellationToken);

                comparisonData = comparisonInvoices
                    .GroupBy(i => i.DateCreated.Date)
                    .ToDictionary(g => g.Key, g => aggregate(g.Select(i => i.Total).ToList()));
            }

            List<TimeSeriesDataPointDto> result = [];
            var dayIndex = 0;

            for (var date = start; date <= end; date = date.AddDays(1))
            {
                var currentValue = currentData.GetValueOrDefault(date, 0);
                decimal? comparisonValue = null;

                if (comparisonRange is { } cr && comparisonData != null)
                {
                    var comparisonDate = cr.comparisonStart.AddDays(dayIndex);
                    comparisonValue = comparisonData.TryGetValue(comparisonDate, out var val) ? val : null;
                }

                result.Add(new TimeSeriesDataPointDto(date, currentValue, comparisonValue));
                dayIndex++;
            }

            return result;
        });
    }

    public Task<TimeSeriesResultDto> GetSalesTimeSeriesWithTotalsAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
        => GetSalesTimeSeriesWithTotalsAsync(new AnalyticsQueryParameters
        {
            StartDate = startDate,
            EndDate = endDate
        }, cancellationToken);

    public async Task<TimeSeriesResultDto> GetSalesTimeSeriesWithTotalsAsync(
        AnalyticsQueryParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var start = parameters.StartDate.Date;
        var end = parameters.EndDate.Date.AddDays(1).AddTicks(-1);
        var comparisonRange = ResolveComparisonRange(start, end, parameters);

        var dataPoints = await GetInvoiceTimeSeriesAsync(
            start, end, comparisonRange, totals => totals.Sum(), cancellationToken);

        return BuildTimeSeriesResult(dataPoints, isAverage: false);
    }

    public Task<TimeSeriesResultDto> GetAverageOrderValueTimeSeriesWithTotalsAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
        => GetAverageOrderValueTimeSeriesWithTotalsAsync(new AnalyticsQueryParameters
        {
            StartDate = startDate,
            EndDate = endDate
        }, cancellationToken);

    public async Task<TimeSeriesResultDto> GetAverageOrderValueTimeSeriesWithTotalsAsync(
        AnalyticsQueryParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var start = parameters.StartDate.Date;
        var end = parameters.EndDate.Date.AddDays(1).AddTicks(-1);
        var comparisonRange = ResolveComparisonRange(start, end, parameters);

        var dataPoints = await GetInvoiceTimeSeriesAsync(
            start, end, comparisonRange, totals => totals.Count == 0 ? 0 : totals.Average(), cancellationToken);

        return BuildTimeSeriesResult(dataPoints, isAverage: true);
    }

    private static TimeSeriesResultDto BuildTimeSeriesResult(List<TimeSeriesDataPointDto> dataPoints, bool isAverage)
    {
        var hasComparison = dataPoints.Any(d => d.ComparisonValue.HasValue);

        decimal periodTotal;
        decimal comparisonTotal;

        if (isAverage)
        {
            var nonZeroPoints = dataPoints.Where(d => d.Value > 0).ToList();
            periodTotal = nonZeroPoints.Count > 0 ? nonZeroPoints.Average(d => d.Value) : 0;

            var comparisonPoints = dataPoints.Where(d => d.ComparisonValue is > 0).ToList();
            comparisonTotal = comparisonPoints.Count > 0 ? comparisonPoints.Average(d => d.ComparisonValue!.Value) : 0;
        }
        else
        {
            periodTotal = dataPoints.Sum(d => d.Value);
            comparisonTotal = dataPoints
                .Where(d => d.ComparisonValue.HasValue)
                .Sum(d => d.ComparisonValue!.Value);
        }

        decimal? percentChange = hasComparison
            ? CalculatePercentChange(periodTotal, comparisonTotal)
            : null;

        return new TimeSeriesResultDto(
            DataPoints: dataPoints,
            PeriodTotal: periodTotal,
            ComparisonTotal: hasComparison ? comparisonTotal : null,
            PercentChange: percentChange
        );
    }

    public Task<SalesBreakdownDto> GetSalesBreakdownAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
        => GetSalesBreakdownAsync(new AnalyticsQueryParameters
        {
            StartDate = startDate,
            EndDate = endDate
        }, cancellationToken);

    public async Task<SalesBreakdownDto> GetSalesBreakdownAsync(
        AnalyticsQueryParameters parameters,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        return await scope.ExecuteWithContextAsync(async db =>
        {
            var start = parameters.StartDate.Date;
            var end = parameters.EndDate.Date.AddDays(1).AddTicks(-1);
            var comparisonRange = ResolveComparisonRange(start, end, parameters);

            // Current period data
            var currentInvoices = await db.Invoices
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.LineItems)
                .Include(i => i.Payments)
                .AsSplitQuery()
                .Where(i => !i.IsDeleted && i.DateCreated >= start && i.DateCreated <= end)
                .ToListAsync(cancellationToken);

            var currentBreakdown = CalculateBreakdown(currentInvoices);

            // Comparison period data (only when comparison is enabled)
            BreakdownData comparisonBreakdown;
            if (comparisonRange is { } comp)
            {
                var comparisonInvoices = await db.Invoices
                    .Include(i => i.Orders)!
                        .ThenInclude(o => o.LineItems)
                    .Include(i => i.Payments)
                    .AsSplitQuery()
                    .Where(i => !i.IsDeleted && i.DateCreated >= comp.comparisonStart && i.DateCreated <= comp.comparisonEnd)
                    .ToListAsync(cancellationToken);

                comparisonBreakdown = CalculateBreakdown(comparisonInvoices);
            }
            else
            {
                comparisonBreakdown = BreakdownData.Empty;
            }

            return new SalesBreakdownDto(
                GrossSales: currentBreakdown.GrossSales,
                GrossSalesChange: comparisonRange.HasValue ? CalculatePercentChange(currentBreakdown.GrossSales, comparisonBreakdown.GrossSales) : 0,
                Discounts: currentBreakdown.Discounts,
                DiscountsChange: comparisonRange.HasValue ? CalculatePercentChange(currentBreakdown.Discounts, comparisonBreakdown.Discounts) : 0,
                Returns: currentBreakdown.Returns,
                ReturnsChange: comparisonRange.HasValue ? CalculatePercentChange(currentBreakdown.Returns, comparisonBreakdown.Returns) : 0,
                NetSales: currentBreakdown.NetSales,
                NetSalesChange: comparisonRange.HasValue ? CalculatePercentChange(currentBreakdown.NetSales, comparisonBreakdown.NetSales) : 0,
                ShippingCharges: currentBreakdown.ShippingCharges,
                ShippingChargesChange: comparisonRange.HasValue ? CalculatePercentChange(currentBreakdown.ShippingCharges, comparisonBreakdown.ShippingCharges) : 0,
                ReturnFees: currentBreakdown.ReturnFees,
                ReturnFeesChange: comparisonRange.HasValue ? CalculatePercentChange(currentBreakdown.ReturnFees, comparisonBreakdown.ReturnFees) : 0,
                Taxes: currentBreakdown.Taxes,
                TaxesChange: comparisonRange.HasValue ? CalculatePercentChange(currentBreakdown.Taxes, comparisonBreakdown.Taxes) : 0,
                TotalSales: currentBreakdown.TotalSales,
                TotalSalesChange: comparisonRange.HasValue ? CalculatePercentChange(currentBreakdown.TotalSales, comparisonBreakdown.TotalSales) : 0,
                TotalCost: currentBreakdown.TotalCost,
                TotalCostChange: comparisonRange.HasValue ? CalculatePercentChange(currentBreakdown.TotalCost, comparisonBreakdown.TotalCost) : 0,
                GrossProfit: currentBreakdown.GrossProfit,
                GrossProfitChange: comparisonRange.HasValue ? CalculatePercentChange(currentBreakdown.GrossProfit, comparisonBreakdown.GrossProfit) : 0,
                GrossProfitMargin: currentBreakdown.GrossProfitMargin,
                GrossProfitMarginChange: comparisonRange.HasValue ? currentBreakdown.GrossProfitMargin - comparisonBreakdown.GrossProfitMargin : 0
            );
        });
    }

    public async Task<List<Product>> GetBestSellersAsync(
        int take = 8,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        return await scope.ExecuteWithContextAsync(async db =>
        {
            // Get order IDs for confirmed sales (Processing through Completed, excluding Cancelled/OnHold)
            var ordersQuery = db.Orders
                .Where(o => o.Status >= OrderStatus.Processing
                         && o.Status != OrderStatus.Cancelled
                         && o.Status != OrderStatus.OnHold);

            if (fromDate.HasValue)
            {
                ordersQuery = ordersQuery.Where(o => o.DateCreated >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                ordersQuery = ordersQuery.Where(o => o.DateCreated <= toDate.Value);
            }

            var validOrderIds = await ordersQuery
                .Select(o => o.Id)
                .ToListAsync(cancellationToken);

            if (validOrderIds.Count == 0)
            {
                return [];
            }

            // Fetch line items from valid orders (SQLite doesn't support GroupBy in SQL)
            var lineItems = await db.LineItems
                .Where(li => li.LineItemType == LineItemType.Product
                          && li.ProductId != null
                          && li.OrderId != null
                          && validOrderIds.Contains(li.OrderId.Value))
                .Select(li => new { li.ProductId, li.Quantity })
                .ToListAsync(cancellationToken);

            if (lineItems.Count == 0)
            {
                return [];
            }

            // Aggregate in memory for SQLite compatibility
            var productSales = lineItems
                .GroupBy(li => li.ProductId!.Value)
                .Select(g => new { ProductId = g.Key, TotalQuantity = g.Sum(li => li.Quantity) })
                .OrderByDescending(x => x.TotalQuantity)
                .Take(take)
                .ToList();

            // Get full product details with ProductRoot
            var productIds = productSales.Select(x => x.ProductId).ToList();
            var products = await db.Products
                .Include(p => p.ProductRoot)
                .Where(p => productIds.Contains(p.Id))
                .ToListAsync(cancellationToken);

            // Preserve sales order
            return productSales
                .Select(ps => products.FirstOrDefault(p => p.Id == ps.ProductId))
                .Where(p => p != null)
                .Cast<Product>()
                .ToList();
        });
    }

    private static BreakdownData CalculateBreakdown(List<Invoice> invoices)
    {
        var grossSales = invoices.Sum(i => i.SubTotalInStoreCurrency ?? i.SubTotal);
        var discounts = invoices.Sum(i => i.DiscountInStoreCurrency ?? i.Discount);
        var taxes = invoices.Sum(i => i.TaxInStoreCurrency ?? i.Tax);

        // Calculate shipping from Order.ShippingCost
        var shippingCharges = invoices
            .SelectMany(i => i.Orders ?? [])
            .Sum(o => o.ShippingCostInStoreCurrency ?? o.ShippingCost);

        // Calculate returns (refunds are negative amounts)
        var returns = invoices
            .SelectMany(i => i.Payments ?? [])
            .Where(p => p.PaymentType is PaymentType.Refund or PaymentType.PartialRefund)
            .Sum(p => Math.Abs(p.AmountInStoreCurrency ?? p.Amount));

        // Return fees are typically 0 unless you have a specific return fee model
        var returnFees = 0m;

        var netSales = grossSales - discounts - returns;
        var totalSales = netSales + shippingCharges + taxes - returnFees;

        // Calculate cost of goods from order line items (Product and Addon types)
        // Cost is captured at order time for historical accuracy
        var totalCost = invoices
            .SelectMany(i => i.Orders ?? [])
            .SelectMany(o => o.LineItems ?? [])
            .Where(li => li.LineItemType == LineItemType.Product
                      || li.LineItemType == LineItemType.Addon
                      || li.LineItemType == LineItemType.Custom)
            .Sum(li => (li.CostInStoreCurrency ?? li.Cost) * li.Quantity);

        var grossProfit = netSales - totalCost;
        var grossProfitMargin = netSales > 0 ? Math.Round(grossProfit / netSales * 100, 2) : 0;

        return new BreakdownData(
            grossSales,
            discounts,
            returns,
            netSales,
            shippingCharges,
            returnFees,
            taxes,
            totalSales,
            totalCost,
            grossProfit,
            grossProfitMargin);
    }

    private static (DateTime comparisonStart, DateTime comparisonEnd)? ResolveComparisonRange(
        DateTime start,
        DateTime end,
        AnalyticsQueryParameters parameters)
    {
        switch (parameters.CompareMode)
        {
            case CompareMode.None:
                return null;

            case CompareMode.PreviousYear:
                return (start.AddYears(-1), end.AddYears(-1));

            case CompareMode.Custom when parameters.ComparisonStartDate.HasValue && parameters.ComparisonEndDate.HasValue:
                return (parameters.ComparisonStartDate.Value.Date,
                        parameters.ComparisonEndDate.Value.Date.AddDays(1).AddTicks(-1));

            default: // Previous (and Custom fallback when dates missing)
            {
                var periodLength = (end.Date - start.Date).Days + 1;
                return (start.AddDays(-periodLength), start.AddTicks(-1));
            }
        }
    }

    private static decimal CalculatePercentChange(decimal current, decimal previous)
    {
        if (previous == 0)
            return current > 0 ? 100 : 0;

        return Math.Round((current - previous) / Math.Abs(previous) * 100, 1);
    }

    private async Task<(decimal current, decimal comparison)> CalculateReturningCustomerRateAsync(
        MerchelloDbContext db,
        List<InvoiceSummary> currentInvoices,
        List<InvoiceSummary> comparisonInvoices,
        DateTime currentStart,
        DateTime comparisonStart,
        CancellationToken cancellationToken)
    {
        // Get unique customer emails for current period
        var currentEmails = currentInvoices
            .Select(i => i.Email)
            .Where(e => !string.IsNullOrEmpty(e))
            .Distinct()
            .ToList();

        if (currentEmails.Count == 0)
            return (0, 0);

        // Check which of these emails had orders before the current period
        var returningCount = await db.Invoices
            .Where(i => !i.IsDeleted && i.DateCreated < currentStart)
            .Where(i => currentEmails.Contains(i.BillingAddress.Email))
            .Select(i => i.BillingAddress.Email)
            .Distinct()
            .CountAsync(cancellationToken);

        var currentReturningRate = Math.Round((decimal)returningCount / currentEmails.Count * 100, 1);

        // Same for comparison period
        var comparisonEmails = comparisonInvoices
            .Select(i => i.Email)
            .Where(e => !string.IsNullOrEmpty(e))
            .Distinct()
            .ToList();

        if (comparisonEmails.Count == 0)
            return (currentReturningRate, 0);

        var comparisonReturningCount = await db.Invoices
            .Where(i => !i.IsDeleted && i.DateCreated < comparisonStart)
            .Where(i => comparisonEmails.Contains(i.BillingAddress.Email))
            .Select(i => i.BillingAddress.Email)
            .Distinct()
            .CountAsync(cancellationToken);

        var comparisonReturningRate = Math.Round((decimal)comparisonReturningCount / comparisonEmails.Count * 100, 1);

        return (currentReturningRate, comparisonReturningRate);
    }

    private static List<decimal> GetDailySparklineData(
        List<InvoiceSummary> items,
        DateTime start,
        DateTime end,
        Func<InvoiceSummary, decimal> valueSelector)
    {
        List<decimal> result = [];

        for (var date = start; date <= end; date = date.AddDays(1))
        {
            var dayValue = items
                .Where(i => i.DateCreated.Date == date)
                .Sum(valueSelector);
            result.Add(dayValue);
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<OrderStatsDto> GetOrderStatsAsync(CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);
        var now = DateTime.UtcNow;

        using var scope = efCoreScopeProvider.CreateScope();
        var stats = await scope.ExecuteWithContextAsync(async db =>
        {
            var todaysInvoices = await db.Invoices
                .AsNoTracking()
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.LineItems)
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.Shipments)
                .Where(i => !i.IsDeleted && i.DateCreated >= today && i.DateCreated < tomorrow)
                .ToListAsync(cancellationToken);

            var ordersToday = todaysInvoices.Count;

            var itemsOrderedToday = todaysInvoices
                .SelectMany(i => i.Orders ?? [])
                .SelectMany(o => o.LineItems ?? [])
                .Sum(li => li.Quantity);

            var ordersFulfilledToday = todaysInvoices
                .Where(i => i.Orders != null && i.Orders.Any() &&
                            i.Orders.All(o => o.Status == OrderStatus.Shipped || o.Status == OrderStatus.Completed))
                .Count();

            // Calculate outstanding values across all unpaid invoices
            var unpaidInvoices = await db.Invoices
                .AsNoTracking()
                .Include(i => i.Payments)
                .Where(i => !i.IsDeleted && !i.IsCancelled)
                .ToListAsync(cancellationToken);

            decimal totalOutstanding = 0;
            int outstandingCount = 0;
            int overdueCount = 0;

            foreach (var invoice in unpaidInvoices)
            {
                var paymentStatus = paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
                {
                    Payments = invoice.Payments ?? [],
                    InvoiceTotal = invoice.Total,
                    CurrencyCode = invoice.CurrencyCode
                });

                if (paymentStatus.BalanceDue > 0)
                {
                    totalOutstanding += paymentStatus.BalanceDue;
                    outstandingCount++;

                    if (invoice.DueDate.HasValue && invoice.DueDate.Value < now)
                    {
                        overdueCount++;
                    }
                }
            }

            return new OrderStatsDto
            {
                OrdersToday = ordersToday,
                ItemsOrderedToday = itemsOrderedToday,
                OrdersFulfilledToday = ordersFulfilledToday,
                TotalOutstandingValue = totalOutstanding,
                OutstandingInvoiceCount = outstandingCount,
                OverdueInvoiceCount = overdueCount,
                CurrencyCode = _settings.StoreCurrencyCode
            };
        });
        scope.Complete();

        return stats;
    }

    /// <inheritdoc />
    public async Task<DashboardStatsDto> GetDashboardStatsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var thisMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var lastMonthStart = thisMonthStart.AddMonths(-1);
        var lastMonthEnd = thisMonthStart;

        using var scope = efCoreScopeProvider.CreateScope();
        var stats = await scope.ExecuteWithContextAsync(async db =>
        {
            var thisMonthInvoices = await db.Invoices
                .AsNoTracking()
                .Where(i => !i.IsDeleted && i.DateCreated >= thisMonthStart)
                .ToListAsync(cancellationToken);

            var lastMonthInvoices = await db.Invoices
                .AsNoTracking()
                .Where(i => !i.IsDeleted && i.DateCreated >= lastMonthStart && i.DateCreated < lastMonthEnd)
                .ToListAsync(cancellationToken);

            // Orders stats
            var ordersThisMonth = thisMonthInvoices.Count;
            var ordersLastMonth = lastMonthInvoices.Count;
            var ordersChangePercent = ordersLastMonth > 0
                ? Math.Round(((decimal)(ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100, 1)
                : (ordersThisMonth > 0 ? 100m : 0m);

            // Revenue stats
            var revenueThisMonth = thisMonthInvoices.Sum(i => i.TotalInStoreCurrency ?? i.Total);
            var revenueLastMonth = lastMonthInvoices.Sum(i => i.TotalInStoreCurrency ?? i.Total);
            var revenueChangePercent = revenueLastMonth > 0
                ? Math.Round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100, 1)
                : (revenueThisMonth > 0 ? 100m : 0m);

            // Product count
            var productCount = await db.RootProducts.CountAsync(cancellationToken);
            var productCountChange = 0;

            // Customer count (unique billing emails)
            var allEmails = await db.Invoices
                .AsNoTracking()
                .Where(i => !i.IsDeleted && i.BillingAddress.Email != null)
                .Select(i => i.BillingAddress.Email)
                .Distinct()
                .ToListAsync(cancellationToken);
            var customerCount = allEmails.Count;

            // New customers this month
            var emailsBeforeThisMonth = await db.Invoices
                .AsNoTracking()
                .Where(i => !i.IsDeleted && i.DateCreated < thisMonthStart && i.BillingAddress.Email != null)
                .Select(i => i.BillingAddress.Email)
                .Distinct()
                .ToListAsync(cancellationToken);
            var emailsThisMonth = thisMonthInvoices
                .Where(i => i.BillingAddress?.Email != null)
                .Select(i => i.BillingAddress!.Email)
                .Distinct()
                .ToList();
            var newCustomersThisMonth = emailsThisMonth.Count(e => !emailsBeforeThisMonth.Contains(e));

            return new DashboardStatsDto
            {
                StoreCurrencyCode = _settings.StoreCurrencyCode,
                StoreCurrencySymbol = currencyService.GetCurrency(_settings.StoreCurrencyCode).Symbol,
                OrdersThisMonth = ordersThisMonth,
                OrdersChangePercent = ordersChangePercent,
                RevenueThisMonth = revenueThisMonth,
                RevenueChangePercent = revenueChangePercent,
                ProductCount = productCount,
                ProductCountChange = productCountChange,
                CustomerCount = customerCount,
                CustomerCountChange = newCustomersThisMonth
            };
        });
        scope.Complete();

        return stats;
    }

    /// <inheritdoc />
    public async Task<List<OrderExportItemDto>> GetOrdersForExportAsync(
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default)
    {
        // Ensure toDate includes the entire day
        var toDateEndOfDay = toDate.Date.AddDays(1).AddTicks(-1);

        using var scope = efCoreScopeProvider.CreateScope();
        var exportItems = await scope.ExecuteWithContextAsync(async db =>
        {
            var invoices = await db.Invoices
                .AsNoTracking()
                .AsSplitQuery()
                .Include(i => i.Orders)
                .Include(i => i.Payments)
                .Where(i => !i.IsDeleted
                    && i.DateCreated >= fromDate.Date
                    && i.DateCreated <= toDateEndOfDay)
                .OrderBy(i => i.DateCreated)
                .ToListAsync(cancellationToken);

            List<OrderExportItemDto> result = [];

            foreach (var invoice in invoices)
            {
                var payments = invoice.Payments?.ToList() ?? [];
                var paymentDetails = paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
                {
                    Payments = payments,
                    InvoiceTotal = invoice.Total,
                    CurrencyCode = invoice.CurrencyCode
                });
                var shippingTotal = invoice.Orders?.Sum(o => o.ShippingCost) ?? 0;
                var shippingTotalInStoreCurrency = invoice.Orders?.Sum(o => o.ShippingCostInStoreCurrency ?? o.ShippingCost) ?? 0;

                result.Add(new OrderExportItemDto
                {
                    InvoiceNumber = invoice.InvoiceNumber,
                    InvoiceDate = invoice.DateCreated,
                    PaymentStatus = paymentDetails.StatusDisplay,
                    BillingName = invoice.BillingAddress?.Name ?? string.Empty,
                    SubTotal = invoice.SubTotal,
                    Tax = invoice.Tax,
                    Shipping = shippingTotal,
                    Total = invoice.Total,
                    CurrencyCode = invoice.CurrencyCode,
                    StoreCurrencyCode = invoice.StoreCurrencyCode,
                    SubTotalInStoreCurrency = invoice.SubTotalInStoreCurrency,
                    TaxInStoreCurrency = invoice.TaxInStoreCurrency,
                    ShippingInStoreCurrency = shippingTotalInStoreCurrency,
                    TotalInStoreCurrency = invoice.TotalInStoreCurrency
                });
            }

            return result;
        });
        scope.Complete();

        return exportItems;
    }
}
