namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Result of addon price preview calculation.
/// Backend-calculated to ensure proper currency handling.
/// </summary>
public class AddonPricePreviewDto
{
    /// <summary>
    /// Base price of the variant
    /// </summary>
    public decimal BasePrice { get; set; }

    /// <summary>
    /// Total price adjustment from selected add-ons
    /// </summary>
    public decimal AddonsTotal { get; set; }

    /// <summary>
    /// Total price (BasePrice + AddonsTotal)
    /// </summary>
    public decimal TotalPrice { get; set; }
}

/// <summary>
/// Request for addon price preview
/// </summary>
public class AddonPricePreviewRequest
{
    /// <summary>
    /// Selected add-on values
    /// </summary>
    public List<SelectedAddonDto> SelectedAddons { get; set; } = [];
}

/// <summary>
/// A selected add-on option value
/// </summary>
public class SelectedAddonDto
{
    /// <summary>
    /// Option ID
    /// </summary>
    public Guid OptionId { get; set; }

    /// <summary>
    /// Value ID
    /// </summary>
    public Guid ValueId { get; set; }
}
