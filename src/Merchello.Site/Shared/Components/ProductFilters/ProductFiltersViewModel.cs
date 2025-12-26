using Merchello.Core.Products.Models;

namespace Merchello.Site.Shared.Components.ProductFilters;

public class ProductFiltersViewModel
{
    public List<ProductFilterGroup> FilterGroups { get; set; } = [];
    public List<Guid> SelectedFilterKeys { get; set; } = [];
}
