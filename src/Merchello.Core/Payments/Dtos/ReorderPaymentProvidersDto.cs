namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to reorder payment providers
/// </summary>
public class ReorderPaymentProvidersDto
{
    /// <summary>
    /// Provider setting IDs in desired order
    /// </summary>
    public required List<Guid> OrderedIds { get; set; }
}
