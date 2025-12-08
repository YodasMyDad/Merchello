using Merchello.Core.Locality.Models;

namespace Merchello.Core.Warehouses.Services.Parameters;

public class UpdateWarehouseParameters
{
    public required Guid WarehouseId { get; set; }
    public string? Name { get; set; }
    public string? Code { get; set; }
    public Guid? SupplierId { get; set; }
    public bool ClearSupplierId { get; set; }
    public Address? Address { get; set; }
    public string? AutomationMethod { get; set; }
    public Dictionary<string, object>? ExtendedData { get; set; }
}

