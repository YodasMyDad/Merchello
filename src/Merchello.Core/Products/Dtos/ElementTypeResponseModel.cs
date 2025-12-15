namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Response model for the configured Element Type structure.
/// Used by the frontend to render property editors in the product workspace.
/// </summary>
public class ElementTypeResponseModel
{
    public Guid Id { get; set; }
    public string Alias { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public IEnumerable<ElementTypeContainer> Containers { get; set; } = [];
    public IEnumerable<ElementTypeProperty> Properties { get; set; } = [];
}

/// <summary>
/// Represents a tab or group container within an Element Type.
/// </summary>
public class ElementTypeContainer
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

/// <summary>
/// Represents a property within an Element Type.
/// </summary>
public class ElementTypeProperty
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

/// <summary>
/// Response DTO for available product views.
/// </summary>
public class ProductViewResponseDto
{
    /// <summary>
    /// The view alias (filename without extension, e.g., "Gallery")
    /// </summary>
    public string Alias { get; set; } = string.Empty;

    /// <summary>
    /// The virtual path to the view (e.g., "~/Views/Products/Gallery.cshtml")
    /// </summary>
    public string VirtualPath { get; set; } = string.Empty;
}
