namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Request DTO to apply a promotional discount to an invoice.
/// </summary>
public class ApplyDiscountDto
{
    /// <summary>
    /// The ID of the promotional discount to apply.
    /// </summary>
    public Guid DiscountId { get; set; }
}
