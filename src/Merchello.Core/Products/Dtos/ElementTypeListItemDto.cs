namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Lightweight Element Type info for pickers.
/// </summary>
public class ElementTypeListItemDto
{
    public Guid Key { get; set; }
    public string Alias { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}
