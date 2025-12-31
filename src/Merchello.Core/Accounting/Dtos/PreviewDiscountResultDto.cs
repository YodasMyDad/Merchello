namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Result DTO for discount preview calculation
/// </summary>
public class PreviewDiscountResultDto
{
    /// <summary>
    /// Line total before discount (price * quantity)
    /// </summary>
    public decimal LineTotal { get; set; }

    /// <summary>
    /// Calculated discount amount (always positive)
    /// </summary>
    public decimal DiscountAmount { get; set; }

    /// <summary>
    /// Total after discount applied
    /// </summary>
    public decimal DiscountedTotal { get; set; }
}
