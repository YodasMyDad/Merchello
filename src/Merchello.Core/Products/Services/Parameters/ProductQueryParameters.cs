using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Services.Parameters;

public class ProductQueryParameters
{
    public int CurrentPage { get; set; } = 1;
    public int AmountPerPage { get; set; } = 20;
    public bool NoTracking { get; set; } = true;
    public ProductOrderBy OrderBy { get; set; } = ProductOrderBy.PriceAsc;
    public Guid? ProductTypeKey { get; set; }
    public Guid? ProductRootKey { get; set; }
    public string? ProductTypeAlias { get; set; }
    public List<Guid>? CategoryIds { get; set; }
    public List<Guid>? FilterKeys { get; set; }
    public bool AllVariants { get;set;}
    public bool IncludeProductWarehouses { get; set; } = false;
}

