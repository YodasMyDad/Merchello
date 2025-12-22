namespace Merchello.Core.Products.Services.Parameters;

/// <summary>
/// Parameters for creating a product root (wizard step 1)
/// </summary>
public class CreateProductRootOnlyParameters
{
    /// <summary>
    /// Product name
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Product price
    /// </summary>
    public required decimal Price { get; init; }

    /// <summary>
    /// Cost of goods sold
    /// </summary>
    public required decimal CostOfGoods { get; init; }

    /// <summary>
    /// Product weight
    /// </summary>
    public required decimal Weight { get; init; }

    /// <summary>
    /// Tax group ID
    /// </summary>
    public required Guid TaxGroupId { get; init; }

    /// <summary>
    /// Product type ID
    /// </summary>
    public required Guid ProductTypeId { get; init; }

    /// <summary>
    /// Collection IDs
    /// </summary>
    public required List<Guid> CollectionIds { get; init; }

    /// <summary>
    /// Optional product description
    /// </summary>
    public string? Description { get; init; }
}
