namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO for the configured Element Type structure.
/// Used by the frontend to render property editors in the product workspace.
/// </summary>
public class ElementTypeDto
{
    public Guid Id { get; set; }
    public string Alias { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public IEnumerable<ElementTypeContainerDto> Containers { get; set; } = [];
    public IEnumerable<ElementTypePropertyDto> Properties { get; set; } = [];
}
