namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Tax group data transfer object
/// </summary>
public class TaxGroupDto
{
    /// <summary>
    /// Tax group ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Tax group name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Tax percentage rate (0-100)
    /// </summary>
    public decimal TaxPercentage { get; set; }
}

/// <summary>
/// DTO for creating a new tax group
/// </summary>
public class CreateTaxGroupDto
{
    /// <summary>
    /// Tax group name (required)
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Tax percentage rate (0-100)
    /// </summary>
    public decimal TaxPercentage { get; set; }
}

/// <summary>
/// DTO for updating an existing tax group
/// </summary>
public class UpdateTaxGroupDto
{
    /// <summary>
    /// Tax group name (required)
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Tax percentage rate (0-100)
    /// </summary>
    public decimal TaxPercentage { get; set; }
}
