using Merchello.Core.Products.Models;

namespace Merchello.Site.Shared.Components.SortDropdown;

public class SortDropdownViewModel
{
    public ProductOrderBy SelectedOrderBy { get; set; }

    public static IReadOnlyList<(ProductOrderBy Value, string Label)> SortOptions =>
    [
        (ProductOrderBy.PriceAsc, "Price: Low to High"),
        (ProductOrderBy.PriceDesc, "Price: High to Low"),
        (ProductOrderBy.DateCreated, "Newest"),
        (ProductOrderBy.Popularity, "Popularity")
    ];
}
