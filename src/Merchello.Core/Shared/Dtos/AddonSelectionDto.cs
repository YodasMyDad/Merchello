namespace Merchello.Core.Shared.Dtos;

/// <summary>
/// Selected add-on option value.
/// </summary>
public class AddonSelectionDto
{
    /// <summary>
    /// Option ID.
    /// </summary>
    public Guid OptionId { get; set; }

    /// <summary>
    /// Value ID.
    /// </summary>
    public Guid ValueId { get; set; }
}
