namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Result of adding a post-purchase upsell item to an existing order.
/// </summary>
public class PostPurchaseResultDto
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public string? PaymentTransactionId { get; set; }
    public decimal AmountCharged { get; set; }
    public string FormattedAmountCharged { get; set; } = string.Empty;
    public Guid? AddedLineItemId { get; set; }
}
