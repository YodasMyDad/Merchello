namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for adding a product with optional add-ons to the basket.
/// </summary>
public class AddProductWithAddonsParameters
{
    /// <summary>
    /// The product (variant) ID to add to the basket.
    /// </summary>
    public Guid ProductId { get; set; }

    /// <summary>
    /// Quantity to add (defaults to 1).
    /// </summary>
    public int Quantity { get; set; } = 1;

    /// <summary>
    /// Selected add-on option values (non-variant options with price adjustments).
    /// </summary>
    public List<SelectedAddon> Addons { get; set; } = [];

    /// <summary>
    /// Optional customer ID for logged-in users.
    /// </summary>
    public Guid? CustomerId { get; set; }
}

/// <summary>
/// A selected add-on option value.
/// </summary>
public class SelectedAddon
{
    /// <summary>
    /// The ProductOptionValue ID (the add-on value selected).
    /// </summary>
    public Guid ValueId { get; set; }
}
