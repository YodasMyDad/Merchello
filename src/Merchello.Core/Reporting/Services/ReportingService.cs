using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Payments.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Reporting.Dtos;
using Merchello.Core.Reporting.Models;
using Merchello.Core.Reporting.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Reporting.Services;

public class ReportingService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider) : IReportingService
{
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
                .Include(o => o.Invoice)
                .Where(o => o.Invoice != null && !o.Invoice.IsDeleted
                    && o.CompletedDate >= start && o.CompletedDate <= end
                    && o.Status == OrderStatus.Completed)
                .CountAsync(cancellationToken);

            var comparisonOrdersFulfilled = await db.Orders
                .Include(o => o.Invoice)
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
                .Include(o => o.Invoice)
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
        using var scope = efCoreScopeProvider.CreateScope();
        return await scope.ExecuteWithContextAsync(async db =>
        {
            var start = startDate.Date;
            var end = endDate.Date.AddDays(1).AddTicks(-1);
            var periodLength = (endDate - startDate).Days + 1;

            var comparisonStart = start.AddDays(-periodLength);
            var comparisonEnd = start.AddTicks(-1);

            // Fetch raw data first (SQLite doesn't support GroupBy + Sum in SQL)
            var currentInvoices = await db.Invoices
                .Where(i => !i.IsDeleted && i.DateCreated >= start && i.DateCreated <= end)
                .Select(i => new { i.DateCreated, Total = i.TotalInStoreCurrency ?? i.Total })
                .ToListAsync(cancellationToken);

            var comparisonInvoices = await db.Invoices
                .Where(i => !i.IsDeleted && i.DateCreated >= comparisonStart && i.DateCreated <= comparisonEnd)
                .Select(i => new { i.DateCreated, Total = i.TotalInStoreCurrency ?? i.Total })
                .ToListAsync(cancellationToken);

            // Group and aggregate in memory
            var currentData = currentInvoices
                .GroupBy(i => i.DateCreated.Date)
                .ToDictionary(g => g.Key, g => g.Sum(i => i.Total));

            var comparisonData = comparisonInvoices
                .GroupBy(i => i.DateCreated.Date)
                .ToDictionary(g => g.Key, g => g.Sum(i => i.Total));

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

    public async Task<List<TimeSeriesDataPointDto>> GetAverageOrderValueTimeSeriesAsync(
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

            // Fetch raw data first (SQLite doesn't support GroupBy + Average in SQL)
            var currentInvoices = await db.Invoices
                .Where(i => !i.IsDeleted && i.DateCreated >= start && i.DateCreated <= end)
                .Select(i => new { i.DateCreated, Total = i.TotalInStoreCurrency ?? i.Total })
                .ToListAsync(cancellationToken);

            var comparisonInvoices = await db.Invoices
                .Where(i => !i.IsDeleted && i.DateCreated >= comparisonStart && i.DateCreated <= comparisonEnd)
                .Select(i => new { i.DateCreated, Total = i.TotalInStoreCurrency ?? i.Total })
                .ToListAsync(cancellationToken);

            // Group and calculate average in memory
            var currentData = currentInvoices
                .GroupBy(i => i.DateCreated.Date)
                .ToDictionary(
                    g => g.Key,
                    g => new { Avg = g.Average(i => i.Total), Count = g.Count() });

            var comparisonData = comparisonInvoices
                .GroupBy(i => i.DateCreated.Date)
                .ToDictionary(
                    g => g.Key,
                    g => new { Avg = g.Average(i => i.Total), Count = g.Count() });

            List<TimeSeriesDataPointDto> result = [];
            var dayIndex = 0;

            for (var date = start; date <= end; date = date.AddDays(1))
            {
                var currentValue = currentData.TryGetValue(date, out var curr) && curr.Count > 0 ? curr.Avg : 0;

                var comparisonDate = comparisonStart.AddDays(dayIndex);
                decimal? comparisonValue = comparisonData.TryGetValue(comparisonDate, out var comp) && comp.Count > 0
                    ? comp.Avg
                    : null;

                result.Add(new TimeSeriesDataPointDto(date, currentValue, comparisonValue));
                dayIndex++;
            }

            return result;
        });
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
                .Where(i => !i.IsDeleted && i.DateCreated >= start && i.DateCreated <= end)
                .ToListAsync(cancellationToken);

            // Comparison period data
            var comparisonInvoices = await db.Invoices
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.LineItems)
                .Include(i => i.Payments)
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
                TotalSalesChange: CalculatePercentChange(currentBreakdown.TotalSales, comparisonBreakdown.TotalSales)
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

        return new BreakdownData(
            grossSales,
            discounts,
            returns,
            netSales,
            shippingCharges,
            returnFees,
            taxes,
            totalSales);
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
}
