namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Selected add-on option
/// </summary>
public class StorefrontAddonDto
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
