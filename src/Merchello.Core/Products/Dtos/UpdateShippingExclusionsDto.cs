namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Request payload for updating shipping option exclusions.
/// </summary>
public class UpdateShippingExclusionsDto
{
    public List<Guid> ExcludedShippingOptionIds { get; set; } = [];
}
