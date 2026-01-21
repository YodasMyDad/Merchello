using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Suppliers.Models;

/// <summary>
/// Represents a supplier/vendor that can own one or more warehouses
/// </summary>
public class Supplier
{
    /// <summary>
    /// Supplier Id
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// Supplier name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Supplier code for reference
    /// </summary>
    public string? Code { get; set; }

    /// <summary>
    /// The supplier's business/contact address (not shipping origin)
    /// </summary>
    public Address Address { get; set; } = new();

    /// <summary>
    /// Primary contact name at the supplier
    /// </summary>
    public string? ContactName { get; set; }

    /// <summary>
    /// Primary contact email
    /// </summary>
    public string? ContactEmail { get; set; }

    /// <summary>
    /// Primary contact phone number
    /// </summary>
    public string? ContactPhone { get; set; }

    /// <summary>
    /// Warehouses owned by this supplier
    /// </summary>
    public virtual ICollection<Warehouse> Warehouses { get; set; } = [];

    /// <summary>
    /// Default fulfilment provider for all warehouses owned by this supplier
    /// (can be overridden at warehouse level)
    /// </summary>
    public Guid? DefaultFulfilmentProviderConfigurationId { get; set; }

    /// <summary>
    /// Navigation property to the default fulfilment provider configuration
    /// </summary>
    public virtual FulfilmentProviderConfiguration? DefaultFulfilmentProviderConfiguration { get; set; }

    /// <summary>
    /// General use extended data for storing additional supplier data
    /// (e.g., payment terms, commission rates, etc.)
    /// </summary>
    public Dictionary<string, object> ExtendedData { get; set; } = [];

    /// <summary>
    /// Date the supplier was created
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date the supplier was last updated
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;
}
