using Merchello.Core.Locality.Models;
using Merchello.Core.Suppliers.Models;

namespace Merchello.Core.Suppliers.Factories;

public class SupplierFactory
{
    /// <summary>
    /// Creates a new supplier
    /// </summary>
    /// <param name="name">The supplier name</param>
    /// <param name="address">Optional business address</param>
    /// <returns>A new Supplier instance</returns>
    public Supplier Create(string name, Address? address = null)
    {
        var supplier = new Supplier
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
