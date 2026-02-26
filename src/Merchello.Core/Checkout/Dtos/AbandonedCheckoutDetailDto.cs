using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Dtos;

namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// DTO for detailed view of an abandoned checkout.
/// </summary>
public class AbandonedCheckoutDetailDto
{
    public Guid Id { get; set; }
    public Guid? BasketId { get; set; }
    public Guid? CustomerId { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerName { get; set; }

    public AbandonedCheckoutStatus Status { get; set; }
    public string StatusDisplay { get; set; } = string.Empty;
    public string StatusCssClass { get; set; } = string.Empty;

    // Timestamps
    public DateTime DateCreated { get; set; }
    public DateTime LastActivityUtc { get; set; }
    public DateTime? DateAbandoned { get; set; }
    public DateTime? DateRecovered { get; set; }
    public DateTime? DateConverted { get; set; }
    public DateTime? DateExpired { get; set; }

    // Recovery info
    public Guid? RecoveredInvoiceId { get; set; }
    public string? RecoveryLink { get; set; }
    public DateTime? RecoveryTokenExpiresUtc { get; set; }
    public int RecoveryEmailsSent { get; set; }
    public DateTime? LastRecoveryEmailSentUtc { get; set; }

    // Basket info
    public decimal BasketTotal { get; set; }
    public string FormattedTotal { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public string? CurrencyCode { get; set; }
    public string? CurrencySymbol { get; set; }

    // Addresses (from ExtendedData snapshots)
    public AddressDto? BillingAddress { get; set; }
    public AddressDto? ShippingAddress { get; set; }

    // Basket items (if basket still exists)
    public List<AbandonedCheckoutLineItemDto> LineItems { get; set; } = [];
}
