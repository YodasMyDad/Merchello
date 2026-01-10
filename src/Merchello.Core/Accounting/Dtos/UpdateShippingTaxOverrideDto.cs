namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// DTO for updating an existing shipping tax override
/// </summary>
public class UpdateShippingTaxOverrideDto
{
    /// <summary>
    /// Tax group ID for shipping. Null means shipping is never taxed in this region.
    /// </summary>
    public Guid? ShippingTaxGroupId { get; set; }
}
