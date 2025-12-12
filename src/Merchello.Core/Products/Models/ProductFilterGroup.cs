using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Products.Models;

public class ProductFilterGroup
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public string? Name { get; set; }
    public int SortOrder { get; set; }
    public virtual ICollection<ProductFilter> Filters { get; set; } = new List<ProductFilter>();
}
