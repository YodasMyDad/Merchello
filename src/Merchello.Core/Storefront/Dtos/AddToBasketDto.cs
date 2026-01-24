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
    public List<StorefrontAddonDto> Addons { get; set; } = [];
}
