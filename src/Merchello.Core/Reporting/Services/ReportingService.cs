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

    public async Task<AnalyticsSummaryDto> GetAnalyticsSummaryAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        return await scope.ExecuteWithContextAsync(async db =>
        {
            // Normalize dates to start/end of day
            var start = startDate.Date;
            var end = endDate.Date.AddDays(1).AddTicks(-1);
            var periodLength = (endDate - startDate).Days + 1;

            // Comparison period is the same length, immediately before
            var comparisonStart = start.AddDays(-periodLength);
            var comparisonEnd = start.AddTicks(-1);

            // Current period invoices
            var currentInvoices = await db.Invoices
                .Where(i => !i.IsDeleted && i.DateCreated >= start && i.DateCreated <= end)
                .Select(i => new InvoiceSummary(i.Id, i.SubTotalInStoreCurrency ?? i.SubTotal, i.DateCreated, i.BillingAddress.Email))
                .ToListAsync(cancellationToken);

            // Comparison period invoices
            var comparisonInvoices = await db.Invoices
                .Where(i => !i.IsDeleted && i.DateCreated >= comparisonStart && i.DateCreated <= comparisonEnd)
                .Select(i => new InvoiceSummary(i.Id, i.SubTotalInStoreCurrency ?? i.SubTotal, i.DateCreated, i.BillingAddress.Email))
                .ToListAsync(cancellationToken);

            // Current period orders fulfilled (Completed status)
            var currentOrdersFulfilled = await db.Orders
                .Where(o => o.Invoice != null && !o.Invoice.IsDeleted
                    && o.CompletedDate >= start && o.CompletedDate <= end
                    && o.Status == OrderStatus.Completed)
                .CountAsync(cancellationToken);

            var comparisonOrdersFulfilled = await db.Orders
                .Where(o => o.Invoice != null && !o.Invoice.IsDeleted
                    && o.CompletedDate >= comparisonStart && o.CompletedDate <= comparisonEnd
                    && o.Status == OrderStatus.Completed)
                .CountAsync(cancellationToken);

            // Calculate metrics
            var grossSales = currentInvoices.Sum(i => i.SubTotal);
            var comparisonGrossSales = comparisonInvoices.Sum(i => i.SubTotal);

            var totalOrders = currentInvoices.Count;
            var comparisonTotalOrders = comparisonInvoices.Count;

            // Returning customer rate
            var (returningRate, comparisonReturningRate) = await CalculateReturningCustomerRateAsync(
                db, currentInvoices, comparisonInvoices, start, comparisonStart, cancellationToken);

            // Calculate percentage changes
            var grossSalesChange = CalculatePercentChange(grossSales, comparisonGrossSales);
            var totalOrdersChange = CalculatePercentChange(totalOrders, comparisonTotalOrders);
            var ordersFulfilledChange = CalculatePercentChange(currentOrdersFulfilled, comparisonOrdersFulfilled);
            var returningRateChange = CalculatePercentChange(returningRate, comparisonReturningRate);

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

            // Returning customer sparkline - simplified (0 or 1 for presence)
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
        return await GetInvoiceTimeSeriesAsync(
            startDate,
            endDate,
            totals => totals.Sum(),
            cancellationToken);
    }

    public async Task<List<TimeSeriesDataPointDto>> GetAverageOrderValueTimeSeriesAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        return await GetInvoiceTimeSeriesAsync(
            startDate,
            endDate,
            totals => totals.Count == 0 ? 0 : totals.Average(),
            cancellationToken);
    }

    private async Task<List<TimeSeriesDataPointDto>> GetInvoiceTimeSeriesAsync(
        DateTime startDate,
        DateTime endDate,
        Func<IReadOnlyList<decimal>, decimal> aggregate,
        CancellationToken cancellationToken)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        return await scope.ExecuteWithContextAsync(async db =>
        {
            var start = startDate.Date;
            var end = endDate.Date.AddDays(1).AddTicks(-1);
            var periodLength = (endDate - startDate).Days + 1;

            var comparisonStart = start.AddDays(-periodLength);
            var comparisonEnd = start.AddTicks(-1);

            // Fetch raw data first (SQLite doesn't support GroupBy + aggregate in SQL)
            var currentInvoices = await db.Invoices
                .Where(i => !i.IsDeleted && i.DateCreated >= start && i.DateCreated <= end)
                .Select(i => new { i.DateCreated, Total = i.TotalInStoreCurrency ?? i.Total })
                .ToListAsync(cancellationToken);

            var comparisonInvoices = await db.Invoices
                .Where(i => !i.IsDeleted && i.DateCreated >= comparisonStart && i.DateCreated <= comparisonEnd)
                .Select(i => new { i.DateCreated, Total = i.TotalInStoreCurrency ?? i.Total })
                .ToListAsync(cancellationToken);

            var currentData = currentInvoices
                .GroupBy(i => i.DateCreated.Date)
                .ToDictionary(g => g.Key, g => aggregate(g.Select(i => i.Total).ToList()));

            var comparisonData = comparisonInvoices
                .GroupBy(i => i.DateCreated.Date)
                .ToDictionary(g => g.Key, g => aggregate(g.Select(i => i.Total).ToList()));

            List<TimeSeriesDataPointDto> result = [];
            var dayIndex = 0;

            for (var date = start; date <= end; date = date.AddDays(1))
            {
                var currentValue = currentData.GetValueOrDefault(date, 0);
                var comparisonDate = comparisonStart.AddDays(dayIndex);
                decimal? comparisonValue = comparisonData.TryGetValue(comparisonDate, out var val) ? val : null;

                result.Add(new TimeSeriesDataPointDto(date, currentValue, comparisonValue));
                dayIndex++;
            }

            return result;
        });
    }

    public async Task<TimeSeriesResultDto> GetSalesTimeSeriesWithTotalsAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        var dataPoints = await GetSalesTimeSeriesAsync(startDate, endDate, cancellationToken);

        var periodTotal = dataPoints.Sum(d => d.Value);
        var comparisonTotal = dataPoints
            .Where(d => d.ComparisonValue.HasValue)
            .Sum(d => d.ComparisonValue!.Value);

        var hasComparison = dataPoints.Any(d => d.ComparisonValue.HasValue);
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

    public async Task<TimeSeriesResultDto> GetAverageOrderValueTimeSeriesWithTotalsAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        var dataPoints = await GetAverageOrderValueTimeSeriesAsync(startDate, endDate, cancellationToken);

        // For AOV, calculate overall average instead of sum
        var nonZeroPoints = dataPoints.Where(d => d.Value > 0).ToList();
        var periodTotal = nonZeroPoints.Count > 0 ? nonZeroPoints.Average(d => d.Value) : 0;

        var comparisonPoints = dataPoints.Where(d => d.ComparisonValue.HasValue && d.ComparisonValue.Value > 0).ToList();
        var comparisonTotal = comparisonPoints.Count > 0 ? comparisonPoints.Average(d => d.ComparisonValue!.Value) : 0;

        var hasComparison = dataPoints.Any(d => d.ComparisonValue.HasValue);
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

    public async Task<SalesBreakdownDto> GetSalesBreakdownAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        return await scope.ExecuteWithContextAsync(async db =>
        {
            var start = startDate.Date;
            var end = endDate.Date.AddDays(1).AddTicks(-1);
            var periodLength = (endDate - startDate).Days + 1;

            var comparisonStart = start.AddDays(-periodLength);
            var comparisonEnd = start.AddTicks(-1);

            // Current period data
            var currentInvoices = await db.Invoices
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.LineItems)
                .Include(i => i.Payments)
                .AsSplitQuery()
                .Where(i => !i.IsDeleted && i.DateCreated >= start && i.DateCreated <= end)
                .ToListAsync(cancellationToken);

            // Comparison period data
            var comparisonInvoices = await db.Invoices
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.LineItems)
                .Include(i => i.Payments)
                .AsSplitQuery()
                .Where(i => !i.IsDeleted && i.DateCreated >= comparisonStart && i.DateCreated <= comparisonEnd)
                .ToListAsync(cancellationToken);

            // Calculate current period breakdown
            var currentBreakdown = CalculateBreakdown(currentInvoices);
            var comparisonBreakdown = CalculateBreakdown(comparisonInvoices);

            return new SalesBreakdownDto(
                GrossSales: currentBreakdown.GrossSales,
                GrossSalesChange: CalculatePercentChange(currentBreakdown.GrossSales, comparisonBreakdown.GrossSales),
                Discounts: currentBreakdown.Discounts,
                DiscountsChange: CalculatePercentChange(currentBreakdown.Discounts, comparisonBreakdown.Discounts),
                Returns: currentBreakdown.Returns,
                ReturnsChange: CalculatePercentChange(currentBreakdown.Returns, comparisonBreakdown.Returns),
                NetSales: currentBreakdown.NetSales,
                NetSalesChange: CalculatePercentChange(currentBreakdown.NetSales, comparisonBreakdown.NetSales),
                ShippingCharges: currentBreakdown.ShippingCharges,
                ShippingChargesChange: CalculatePercentChange(currentBreakdown.ShippingCharges, comparisonBreakdown.ShippingCharges),
                ReturnFees: currentBreakdown.ReturnFees,
                ReturnFeesChange: CalculatePercentChange(currentBreakdown.ReturnFees, comparisonBreakdown.ReturnFees),
                Taxes: currentBreakdown.Taxes,
                TaxesChange: CalculatePercentChange(currentBreakdown.Taxes, comparisonBreakdown.Taxes),
                TotalSales: currentBreakdown.TotalSales,
                TotalSalesChange: CalculatePercentChange(currentBreakdown.TotalSales, comparisonBreakdown.TotalSales),
                TotalCost: currentBreakdown.TotalCost,
                TotalCostChange: CalculatePercentChange(currentBreakdown.TotalCost, comparisonBreakdown.TotalCost),
                GrossProfit: currentBreakdown.GrossProfit,
                GrossProfitChange: CalculatePercentChange(currentBreakdown.GrossProfit, comparisonBreakdown.GrossProfit),
                GrossProfitMargin: currentBreakdown.GrossProfitMargin,
                GrossProfitMarginChange: currentBreakdown.GrossProfitMargin - comparisonBreakdown.GrossProfitMargin
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
