namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Request to add item to basket
/// </summary>
public class AddToBasketDto
{
    /// <summary>
    /// The product variant ID to add to the basket
    /// </summary>
    public Guid ProductId { get; set; }

    /// <summary>
    /// Quantity to add (defaults to 1)
    /// </summary>
    public int Quantity { get; set; } = 1;

    /// <summary>
    /// Selected add-on options (non-variant options with price adjustments)
    /// </summary>
    public List<SelectedAddonDto> Addons { get; set; } = [];
}

/// <summary>
/// Selected add-on option
/// </summary>
public class SelectedAddonDto
{
    /// <summary>
    /// The ProductOption ID
    /// </summary>
    public Guid OptionId { get; set; }

    /// <summary>
    /// The ProductOptionValue ID
    /// </summary>
    public Guid ValueId { get; set; }
}

/// <summary>
/// Request to update line item quantity
/// </summary>
public class UpdateQuantityDto
{
    public Guid LineItemId { get; set; }
    public int Quantity { get; set; }
}

/// <summary>
/// Request to set shipping country/region
/// </summary>
public class SetCountryDto
{
    public required string CountryCode { get; set; }
    public string? RegionCode { get; set; }
}

/// <summary>
/// Request to set currency
/// </summary>
public class SetCurrencyDto
{
    public required string CurrencyCode { get; set; }
}
