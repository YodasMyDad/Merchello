namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Request for addon price preview
/// </summary>
public class AddonPricePreviewRequestDto
{
    /// <summary>
    /// Selected add-on values
    /// </summary>
    public List<SelectedAddonDto> SelectedAddons { get; set; } = [];
}
