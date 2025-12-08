using Merchello.Core.Locality.Models;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Warehouses.Factories;

public class WarehouseFactory
{
    /// <summary>
    /// Creates a new warehouse
    /// </summary>
    /// <param name="name">The warehouse name</param>
    /// <param name="address">Optional shipping origin address</param>
    /// <returns>A new Warehouse instance</returns>
    public Warehouse Create(string name, Address? address = null)
    {
        var warehouse = new Warehouse
        {
            Name = name
        };
        if (address != null)
        {
            warehouse.Address = address;
        }

        return warehouse;
    }
}
