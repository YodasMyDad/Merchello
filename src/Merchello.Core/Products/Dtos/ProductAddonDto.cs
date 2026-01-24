namespace Merchello.Core.Products.Dtos;

/// <summary>
/// A selected add-on option value
/// </summary>
public class ProductAddonDto
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
