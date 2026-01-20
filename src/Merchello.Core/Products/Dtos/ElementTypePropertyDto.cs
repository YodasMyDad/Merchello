namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Represents a property within an Element Type.
/// </summary>
public class ElementTypePropertyDto
{
    public Guid Id { get; set; }
    public Guid? ContainerId { get; set; }
    public string Alias { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }

    // Data Type info needed for rendering
    public Guid DataTypeId { get; set; }
    public string PropertyEditorUiAlias { get; set; } = string.Empty;
    public object? DataTypeConfiguration { get; set; }

    // Validation
    public bool Mandatory { get; set; }
    public string? MandatoryMessage { get; set; }
    public string? ValidationRegex { get; set; }
    public string? ValidationRegexMessage { get; set; }

    // Appearance
    public bool LabelOnTop { get; set; }
}
