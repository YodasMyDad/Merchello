namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Request for addon price preview
/// </summary>
public class AddonPricePreviewRequestDto
{
    /// <summary>
    /// Selected add-on values
    /// </summary>
    public List<ProductAddonDto> SelectedAddons { get; set; } = [];
}
