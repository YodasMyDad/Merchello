namespace Merchello.Site.Storefront.Models;

public class AddToBasketRequest
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
    public List<SelectedAddon> Addons { get; set; } = [];
}

public class SelectedAddon
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
