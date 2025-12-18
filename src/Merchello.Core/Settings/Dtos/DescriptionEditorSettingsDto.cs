namespace Merchello.Core.Settings.Dtos;

/// <summary>
/// Settings for the Product Description rich text editor
/// </summary>
public class DescriptionEditorSettingsDto
{
    /// <summary>
    /// The DataType key (GUID) that can be used to fetch configuration
    /// from Umbraco's Management API (/umbraco/management/api/v1/data-type/{key})
    /// </summary>
    public Guid? DataTypeKey { get; set; }

    /// <summary>
    /// The property editor UI alias to use (e.g., "Umb.PropertyEditorUi.Tiptap")
    /// </summary>
    public string PropertyEditorUiAlias { get; set; } = string.Empty;
}
