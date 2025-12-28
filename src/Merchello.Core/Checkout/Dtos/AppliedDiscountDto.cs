namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Represents an applied discount in the checkout.
/// </summary>
public class AppliedDiscountDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string? Code { get; set; }
    public decimal Amount { get; set; }
    public string FormattedAmount { get; set; } = "";
    public bool IsAutomatic { get; set; }
}
