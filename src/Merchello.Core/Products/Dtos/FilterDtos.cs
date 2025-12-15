namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Data transfer object for a product filter group with its filters
/// </summary>
public class ProductFilterGroupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public List<ProductFilterDto> Filters { get; set; } = [];
}

/// <summary>
/// Data transfer object for a product filter
/// </summary>
public class ProductFilterDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string? HexColour { get; set; }
    public Guid? Image { get; set; }
    public Guid FilterGroupId { get; set; }
    public int ProductCount { get; set; }
}

/// <summary>
/// DTO for creating a new filter group
/// </summary>
public class CreateFilterGroupDto
{
    public required string Name { get; set; }
}

/// <summary>
/// DTO for updating a filter group
/// </summary>
public class UpdateFilterGroupDto
{
    public string? Name { get; set; }
    public int? SortOrder { get; set; }
}

/// <summary>
/// DTO for creating a new filter within a group
/// </summary>
public class CreateFilterDto
{
    public required string Name { get; set; }
    public string? HexColour { get; set; }
    public Guid? Image { get; set; }
}

/// <summary>
/// DTO for updating a filter
/// </summary>
public class UpdateFilterDto
{
    public string? Name { get; set; }
    public string? HexColour { get; set; }
    public Guid? Image { get; set; }
    public int? SortOrder { get; set; }
}

/// <summary>
/// DTO for assigning filters to a product
/// </summary>
public class AssignFiltersDto
{
    public List<Guid> FilterIds { get; set; } = [];
}
