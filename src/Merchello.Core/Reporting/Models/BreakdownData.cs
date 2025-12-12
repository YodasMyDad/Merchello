namespace Merchello.Core.Reporting.Models;

/// <summary>
/// Internal breakdown data used in sales breakdown calculations.
/// </summary>
internal record BreakdownData(
    decimal GrossSales,
    decimal Discounts,
    decimal Returns,
    decimal NetSales,
    decimal ShippingCharges,
    decimal ReturnFees,
    decimal Taxes,
    decimal TotalSales);
