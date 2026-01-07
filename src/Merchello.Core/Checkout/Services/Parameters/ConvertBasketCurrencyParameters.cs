namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for converting a basket's currency.
/// </summary>
public class ConvertBasketCurrencyParameters
{
    /// <summary>
    /// Gets or sets the new currency code (ISO 4217).
    /// </summary>
    public required string NewCurrencyCode { get; set; }

    /// <summary>
    /// Gets or sets the new currency symbol. If null, will be resolved from currency service.
    /// </summary>
    public string? NewCurrencySymbol { get; set; }
}
