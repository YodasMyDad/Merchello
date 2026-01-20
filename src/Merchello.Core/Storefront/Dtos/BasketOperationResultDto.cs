namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Result of a basket operation (add, update, remove)
/// </summary>
public class BasketOperationResultDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public int ItemCount { get; set; }
    public decimal Total { get; set; }
    public string? FormattedTotal { get; set; }
}
