namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// DTO for paginated abandoned checkout results.
/// </summary>
public class AbandonedCheckoutPageDto
{
    public List<AbandonedCheckoutListItemDto> Items { get; set; } = [];
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
    public int CurrentPage { get; set; }
    public int PageSize { get; set; }
}
