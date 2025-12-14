namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Lightweight DTO for warehouse dropdown selection in shipping configuration.
/// </summary>
public class ShippingWarehouseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Code { get; set; }
}
