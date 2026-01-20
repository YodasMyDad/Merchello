namespace Merchello.Core.Products.Dtos;

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
