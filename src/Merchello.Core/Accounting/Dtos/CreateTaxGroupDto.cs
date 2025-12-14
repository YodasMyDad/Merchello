namespace Merchello.Core.Accounting.Dtos;

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
