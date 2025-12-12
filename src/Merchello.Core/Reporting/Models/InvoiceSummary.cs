namespace Merchello.Core.Reporting.Models;

/// <summary>
/// Internal summary projection for invoice queries used in analytics calculations.
/// </summary>
internal record InvoiceSummary(Guid Id, decimal SubTotal, DateTime DateCreated, string? Email);
