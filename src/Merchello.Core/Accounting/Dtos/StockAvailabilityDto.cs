namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Stock availability info for a line item
/// </summary>
public class StockAvailabilityDto
{
    public Guid LineItemId { get; set; }
    public Guid? ProductId { get; set; }
    public string? ProductName { get; set; }
    public int CurrentQuantity { get; set; }
    public int RequestedQuantity { get; set; }
    public int AvailableStock { get; set; }
    public bool IsStockTracked { get; set; }
    public bool HasSufficientStock { get; set; }
    public string? WarningMessage { get; set; }
}

