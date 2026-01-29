using Merchello.Core.Payments.Dtos;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Available post-purchase upsell suggestions for an invoice.
/// </summary>
public class PostPurchaseUpsellsDto
{
    public Guid InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public List<UpsellSuggestionDto> Suggestions { get; set; } = [];
    public StorefrontSavedMethodDto? SavedPaymentMethod { get; set; }
    public int TimeRemainingSeconds { get; set; }
    public bool WindowExpired { get; set; }
}
