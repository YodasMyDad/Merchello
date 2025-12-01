using Merchello.Core.Locality.Models;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Warehouses.Factories;

public class WarehouseFactory
{
    /// <summary>
    /// Creates a new supplier
    /// </summary>
    /// <param name="name"></param>
    /// <param name="address"></param>
    /// <returns></returns>
    public Warehouse Create(string name, Address? address = null)
    {
        var supplier = new Warehouse
        {
            Name = name
        };
        if (address != null)
        {
            supplier.Address = address;
        }

        return supplier;
    }
}
