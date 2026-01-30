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
    public List<Merchello.Core.Shared.Dtos.AddonSelectionDto> Addons { get; set; } = [];

    /// <summary>
    /// Optional customer ID for logged-in users.
    /// </summary>
    public Guid? CustomerId { get; set; }
}
