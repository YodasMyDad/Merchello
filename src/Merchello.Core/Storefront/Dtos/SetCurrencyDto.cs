namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Request to set currency
/// </summary>
public class SetCurrencyDto
{
    public required string CurrencyCode { get; set; }
}
