namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Currency information for storefront
/// </summary>
public class StorefrontCurrencyDto
{
    public required string CurrencyCode { get; set; }
    public required string CurrencySymbol { get; set; }
    public int DecimalPlaces { get; set; }
}
