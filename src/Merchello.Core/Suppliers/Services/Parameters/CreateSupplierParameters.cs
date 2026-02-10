using Merchello.Core.Locality.Models;

namespace Merchello.Core.Suppliers.Services.Parameters;

public class CreateSupplierParameters
{
    /// <summary>
    /// Supplier name (required)
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// Supplier code for reference
    /// </summary>
    public string? Code { get; set; }

    /// <summary>
    /// Business/contact address
    /// </summary>
    public Address? Address { get; set; }

    /// <summary>
    /// Primary contact name
    /// </summary>
    public string? ContactName { get; set; }

    /// <summary>
    /// Primary contact email
    /// </summary>
    public string? ContactEmail { get; set; }

    /// <summary>
    /// Primary contact phone
    /// </summary>
    public string? ContactPhone { get; set; }

    /// <summary>
    /// Extended data for custom properties
    /// </summary>
    public Dictionary<string, object>? ExtendedData { get; set; }

    /// <summary>
    /// Default fulfilment provider configuration for all warehouses owned by this supplier
    /// </summary>
    public Guid? DefaultFulfilmentProviderConfigurationId { get; set; }
}
