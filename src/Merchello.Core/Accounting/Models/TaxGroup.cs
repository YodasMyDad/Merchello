using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Accounting.Models;

/// <summary>
/// Tax group for specific countries or regions
/// </summary>
public class TaxGroup
{
    /// <summary>
    /// Tax group Id
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// Tax group name
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Tax Percentage to be added
    /// </summary>
    public decimal TaxPercentage { get; set; }

    /// <summary>
    /// Products assigned to this tax group
    /// </summary>
    public virtual ICollection<ProductRoot> Products { get; set; } = [];

    /// <summary>
    /// Geographic-specific tax rates for this group
    /// </summary>
    public virtual ICollection<TaxGroupRate> Rates { get; set; } = [];

    /// <summary>
    /// Update date
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Create date
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
}
