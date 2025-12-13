namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// DTO for order export CSV data
/// </summary>
public class OrderExportItemDto
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string BillingName { get; set; } = string.Empty;
    public decimal SubTotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Shipping { get; set; }
    public decimal Total { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;
    public string StoreCurrencyCode { get; set; } = string.Empty;
    public decimal? SubTotalInStoreCurrency { get; set; }
    public decimal? TaxInStoreCurrency { get; set; }
    public decimal? ShippingInStoreCurrency { get; set; }
    public decimal? TotalInStoreCurrency { get; set; }
}
