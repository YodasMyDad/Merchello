using Merchello.Core.Locality.Dtos;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Result DTO for customer lookup, containing customer info and their past shipping addresses
/// </summary>
public class CustomerLookupResultDto
{
    /// <summary>
    /// Customer name from billing address
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Customer email from billing address
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Customer phone from billing address
    /// </summary>
    public string? Phone { get; set; }

    /// <summary>
    /// The most recent billing address for this customer
    /// </summary>
    public AddressDto BillingAddress { get; set; } = new();

    /// <summary>
    /// De-duplicated list of past shipping addresses from this customer's orders
    /// </summary>
    public List<AddressDto> PastShippingAddresses { get; set; } = [];
}
