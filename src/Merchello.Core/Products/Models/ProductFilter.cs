using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Products.Models;

public class ProductFilter : IEquatable<ProductFilter>
{
    /// <summary>
    /// Unique identifier for this filter
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public string? Name { get; set; }
    public int SortOrder { get; set; }
    public string? HexColour { get; set; }
    public Guid? Image { get; set; }
    public virtual ProductFilterGroup ParentGroup { get; set; } = default!;
    public Guid ProductFilterGroupId { get; set; }

    public virtual ICollection<Product> Products { get; set; } = default!;

    public bool Equals(ProductFilter? other)
    {
        return this.Id == other?.Id;
    }
}
