using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Stores.Models;

public class Store
{
    public Country? DefaultCountry { get; set; }
    public Guid DefaultCountryId { get; set; }

    public virtual ICollection<Warehouse> Warehouses { get; set; } = [];
}
