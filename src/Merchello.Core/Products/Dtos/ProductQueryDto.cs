namespace Merchello.Core.Products.Dtos;

public class ProductQueryDto
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 50;

    public string? Search { get; set; }

    public Guid? ProductTypeId { get; set; }

    public Guid? CollectionId { get; set; }

    public string? Availability { get; set; } // "all", "available", "unavailable"

    public string? StockStatus { get; set; }  // "all", "in-stock", "low-stock", "out-of-stock"

    public string? SortBy { get; set; }

    public string? SortDir { get; set; }
}
