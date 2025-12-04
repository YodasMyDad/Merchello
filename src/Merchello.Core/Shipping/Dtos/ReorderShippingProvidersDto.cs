namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Request to reorder shipping providers
/// </summary>
public class ReorderShippingProvidersDto
{
    /// <summary>
    /// Provider configuration IDs in desired order
    /// </summary>
    public required List<Guid> OrderedIds { get; set; }
}
