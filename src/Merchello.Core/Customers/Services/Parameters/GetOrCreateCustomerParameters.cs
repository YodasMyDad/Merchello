using Merchello.Core.Locality.Models;

namespace Merchello.Core.Customers.Services.Parameters;

/// <summary>
/// Parameters for getting or creating a customer by email.
/// </summary>
public class GetOrCreateCustomerParameters
{
    /// <summary>
    /// The customer's email address (required).
    /// </summary>
    public required string Email { get; set; }

    /// <summary>
    /// Optional billing address for new customers.
    /// </summary>
    public Address? BillingAddress { get; set; }

    /// <summary>
    /// Whether the customer accepts marketing communications.
    /// </summary>
    public bool AcceptsMarketing { get; set; }
}
