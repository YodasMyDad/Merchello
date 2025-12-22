namespace Merchello.Core.Products.Services.Parameters;

public class ProductRootQueryParameters
{
    public int CurrentPage { get; set; } = 1;
    public int AmountPerPage { get; set; } = 20;
    public bool NoTracking { get; set; } = true;

    public Guid? ProductTypeKey { get; set; }
    public string? ProductTypeAlias { get; set; }
    public List<Guid>? CollectionIds { get; set; }
}

