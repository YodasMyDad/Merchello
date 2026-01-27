namespace Merchello.Controllers.Dtos;

/// <summary>
/// DTO for creating a payment link.
/// </summary>
public class CreatePaymentLinkDto
{
    /// <summary>
    /// The invoice ID to create a payment link for.
    /// </summary>
    public Guid InvoiceId { get; set; }

    /// <summary>
    /// The payment provider alias to use (e.g., "stripe", "paypal").
    /// </summary>
    public string ProviderAlias { get; set; } = string.Empty;
}
