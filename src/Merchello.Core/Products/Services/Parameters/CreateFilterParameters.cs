namespace Merchello.Core.Products.Services.Parameters;

/// <summary>
/// Parameters for creating a product filter
/// </summary>
public class CreateFilterParameters
{
    /// <summary>
    /// The filter group ID to add the filter to
    /// </summary>
    public required Guid FilterGroupId { get; init; }

    /// <summary>
    /// The filter name
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Optional hex colour value (for colour filters)
    /// </summary>
    public string? HexColour { get; init; }

    /// <summary>
    /// Optional image GUID
    /// </summary>
    public Guid? Image { get; init; }
}
