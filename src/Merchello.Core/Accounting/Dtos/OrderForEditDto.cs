namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Order data for editing
/// </summary>
public class OrderForEditDto
{
    public Guid Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal ShippingCost { get; set; }
    public string? ShippingMethodName { get; set; }
    public List<LineItemForEditDto> LineItems { get; set; } = [];
}

