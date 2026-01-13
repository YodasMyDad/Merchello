namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Configuration for initializing express checkout buttons.
/// </summary>
public class ExpressCheckoutConfigDto
{
    /// <summary>
    /// Currency code for the checkout (e.g., "GBP", "USD").
    /// </summary>
    public required string Currency { get; set; }

    /// <summary>
    /// Total amount for the checkout (including shipping and tax).
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Subtotal amount before shipping and tax.
    /// </summary>
    public decimal SubTotal { get; set; }

    /// <summary>
    /// Shipping amount.
    /// </summary>
    public decimal Shipping { get; set; }

    /// <summary>
    /// Tax amount.
    /// </summary>
    public decimal Tax { get; set; }

    /// <summary>
    /// Country code for the store (used for regional features).
    /// </summary>
    public string? CountryCode { get; set; }

    /// <summary>
    /// Available express checkout methods with their SDK configuration.
    /// </summary>
    public List<ExpressMethodConfigDto> Methods { get; set; } = [];
}
