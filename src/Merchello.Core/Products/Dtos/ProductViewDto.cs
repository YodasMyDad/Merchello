namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO for available product views.
/// </summary>
public class ProductViewDto
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
