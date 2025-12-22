using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Products.Models;

public class ProductCollection : IEquatable<ProductCollection>
{
    /// <summary>
    /// The Id is the umbraco Key
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    public string? Name { get; set; }
    public virtual ICollection<ProductRoot> Products { get; set; } = default!;
    public bool Equals(ProductCollection? other)
    {
        return this.Id == other?.Id;
    }
}
