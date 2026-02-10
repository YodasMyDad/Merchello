using Merchello.Core.Locality.Models;

namespace Merchello.Core.Suppliers.Services.Parameters;

public class UpdateSupplierParameters
{
    /// <summary>
    /// The supplier ID to update
    /// </summary>
    public required Guid SupplierId { get; set; }

    /// <summary>
    /// Supplier name (null to keep existing)
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Supplier code (null to keep existing)
    /// </summary>
    public string? Code { get; set; }

    /// <summary>
    /// Business/contact address (null to keep existing)
    /// </summary>
    public Address? Address { get; set; }

    /// <summary>
    /// Primary contact name (null to keep existing)
    /// </summary>
    public string? ContactName { get; set; }

    /// <summary>
    /// Primary contact email (null to keep existing)
    /// </summary>
    public string? ContactEmail { get; set; }

    /// <summary>
    /// Primary contact phone (null to keep existing)
    /// </summary>
    public string? ContactPhone { get; set; }

    /// <summary>
    /// Extended data (null to keep existing)
    /// </summary>
    public Dictionary<string, object>? ExtendedData { get; set; }

    /// <summary>
    /// Default fulfilment provider configuration (null to keep existing)
    /// </summary>
    public Guid? DefaultFulfilmentProviderConfigurationId { get; set; }

    /// <summary>
    /// When true, clears the default fulfilment provider assignment
    /// </summary>
    public bool ShouldClearDefaultFulfilmentProviderId { get; set; }
}
