namespace Merchello.Core.Checkout.Services.Parameters;

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
