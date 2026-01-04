namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// DTO for updating an existing geographic tax rate
/// </summary>
public class UpdateTaxGroupRateDto
{
    /// <summary>
    /// Tax percentage rate (0-100)
    /// </summary>
    public decimal TaxPercentage { get; set; }
}
