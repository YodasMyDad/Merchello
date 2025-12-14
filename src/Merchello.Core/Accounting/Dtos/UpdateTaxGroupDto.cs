namespace Merchello.Core.Accounting.Dtos;

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
