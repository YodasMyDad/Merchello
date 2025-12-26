using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Models;

namespace Merchello.Site.Category.Models;

public class CategoryPageViewModel
{
    public PaginatedList<Product> Products { get; set; } = new();
    public List<ProductFilterGroup> FilterGroups { get; set; } = [];
    public List<Guid> SelectedFilterKeys { get; set; } = [];
    public Guid CollectionId { get; set; }
    public string? CollectionName { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public decimal PriceRangeMin { get; set; }
    public decimal PriceRangeMax { get; set; }
    public ProductOrderBy OrderBy { get; set; } = ProductOrderBy.PriceAsc;
    public int CurrentPage { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}
