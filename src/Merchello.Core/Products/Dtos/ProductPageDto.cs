namespace Merchello.Core.Products.Dtos;

public class ProductPageDto
{
    public List<ProductListItemDto> Items { get; set; } = [];

    public int Page { get; set; }

    public int PageSize { get; set; }

    public int TotalItems { get; set; }

    public int TotalPages { get; set; }
}
