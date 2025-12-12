namespace Merchello.Core.Reporting.Dtos;

/// <summary>
/// Breakdown of sales metrics for the analytics table.
/// </summary>
public record SalesBreakdownDto(
    decimal GrossSales,
    decimal GrossSalesChange,
    decimal Discounts,
    decimal DiscountsChange,
    decimal Returns,
    decimal ReturnsChange,
    decimal NetSales,
    decimal NetSalesChange,
    decimal ShippingCharges,
    decimal ShippingChargesChange,
    decimal ReturnFees,
    decimal ReturnFeesChange,
    decimal Taxes,
    decimal TaxesChange,
    decimal TotalSales,
    decimal TotalSalesChange
);
