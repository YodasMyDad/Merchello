using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// DTO for displaying abandoned checkouts in a list view.
/// </summary>
public class AbandonedCheckoutListItemDto
{
    public Guid Id { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerName { get; set; }
    public decimal BasketTotal { get; set; }
    public string FormattedTotal { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public AbandonedCheckoutStatus Status { get; set; }
    public string StatusDisplay { get; set; } = string.Empty;
    public string StatusCssClass { get; set; } = string.Empty;
    public DateTime LastActivityUtc { get; set; }
    public DateTime? DateAbandoned { get; set; }
    public int RecoveryEmailsSent { get; set; }
    public string? CurrencyCode { get; set; }
}
