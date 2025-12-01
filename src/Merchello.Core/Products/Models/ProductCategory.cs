using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Products.Models;

public class ProductCategory : IEquatable<ProductCategory>
{
    /// <summary>
    /// The Id is the umbraco Key
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    public string? Name { get; set; }
    public virtual ICollection<ProductRoot> Products { get; set; } = default!;
    public bool Equals(ProductCategory? other)
    {
        return this.Id == other?.Id;
    }
}
