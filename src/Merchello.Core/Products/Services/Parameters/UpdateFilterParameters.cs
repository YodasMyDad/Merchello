namespace Merchello.Core.Products.Services.Parameters;

/// <summary>
/// Parameters for updating a product filter
/// </summary>
public class UpdateFilterParameters
{
    /// <summary>
    /// The filter ID to update
    /// </summary>
    public required Guid FilterId { get; init; }

    /// <summary>
    /// Optional new name
    /// </summary>
    public string? Name { get; init; }

    /// <summary>
    /// Optional hex colour value
    /// </summary>
    public string? HexColour { get; init; }

    /// <summary>
    /// Optional image GUID
    /// </summary>
    public Guid? Image { get; init; }

    /// <summary>
    /// Optional sort order
    /// </summary>
    public int? SortOrder { get; init; }
}
