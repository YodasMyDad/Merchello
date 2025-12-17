namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Paginated response for customer previews.
/// </summary>
public class CustomerPreviewResponseDto
{
    public List<CustomerPreviewDto> Items { get; set; } = [];
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
}
