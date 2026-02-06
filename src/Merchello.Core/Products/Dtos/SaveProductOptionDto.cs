namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO to save a product option (create or update)
/// </summary>
public class SaveProductOptionDto
{
    /// <summary>
    /// Null for new options, set for existing options to update
    /// </summary>
    public Guid? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Alias { get; set; }
    public int SortOrder { get; set; }
    public string? OptionTypeAlias { get; set; }
    public string? OptionUiAlias { get; set; }
    public bool IsVariant { get; set; }
    public bool IsMultiSelect { get; set; } = true;
    public List<SaveOptionValueDto> Values { get; set; } = [];
}
