using Merchello.Core.Payments.Models;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Order list item for the orders grid view
/// </summary>
public class OrderListItemDto
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime DateCreated { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public InvoicePaymentStatus PaymentStatus { get; set; }
    public string PaymentStatusDisplay { get; set; } = string.Empty;
    public string FulfillmentStatus { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public string DeliveryStatus { get; set; } = string.Empty;
    public string DeliveryMethod { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = [];
}
