namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Represents a tab or group container within an Element Type.
/// </summary>
public class ElementTypeContainerDto
{
    public Guid Id { get; set; }
    public Guid? ParentId { get; set; }
    public string? Name { get; set; }
    /// <summary>
    /// Container type: "Tab" or "Group"
    /// </summary>
    public string Type { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
