using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Products.Models;

public class ProductType
{
    /// <summary>
    /// Product id
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public string? Name { get; set; }
    public string? Alias { get; set; }

    /// <summary>
    /// The Categories this product is in
    /// </summary>
    public virtual ICollection<ProductRoot> Products { get; set; } = [];
}
