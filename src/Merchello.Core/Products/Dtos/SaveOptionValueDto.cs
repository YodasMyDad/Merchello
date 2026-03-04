using System.ComponentModel.DataAnnotations;

namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO to save an option value (create or update)
/// </summary>
public class SaveOptionValueDto
{
    /// <summary>
    /// Null for new values, set for existing values to update
    /// </summary>
    public Guid? Id { get; set; }

    [Required]
    [MinLength(1)]
    public string Name { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public int SortOrder { get; set; }
    public string? HexValue { get; set; }
    public Guid? MediaKey { get; set; }
    public decimal PriceAdjustment { get; set; }
    public decimal CostAdjustment { get; set; }
    public string? SkuSuffix { get; set; }
    public decimal? WeightKg { get; set; }
}
