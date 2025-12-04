namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Line item removal with return-to-stock option
/// </summary>
public class RemoveLineItemDto
{
    /// <summary>
    /// Line item ID to remove
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Whether to return the item to available stock (default: true)
    /// Set to false for damaged/faulty items
    /// </summary>
    public bool ReturnToStock { get; set; } = true;
}

