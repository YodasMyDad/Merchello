using Merchello.Core.Locality.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Shipping.Dtos;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Full order detail for the order detail view
/// </summary>
public class OrderDetailDto
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime DateCreated { get; set; }
    public string Channel { get; set; } = string.Empty;

    // Financial
    public decimal SubTotal { get; set; }
    public decimal ShippingCost { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal BalanceDue { get; set; }
    public InvoicePaymentStatus PaymentStatus { get; set; }
    public string PaymentStatusDisplay { get; set; } = string.Empty;
    public string FulfillmentStatus { get; set; } = string.Empty;

    // Addresses
    public AddressDto? BillingAddress { get; set; }
    public AddressDto? ShippingAddress { get; set; }

    // Orders (fulfillment units)
    public List<FulfillmentOrderDto> Orders { get; set; } = [];

    // Timeline/Notes
    public List<InvoiceNoteDto> Notes { get; set; } = [];
}
