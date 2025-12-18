using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Customers.Models;

/// <summary>
/// Represents a customer in the Merchello ecommerce system.
/// Customers are automatically created during checkout based on email.
/// </summary>
public class Customer
{
    /// <summary>
    /// Unique identifier for the customer
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// Customer's email address - primary identifier for matching customers.
    /// Must be unique and is used to match returning customers during checkout.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Optional link to Umbraco Member for logged-in account scenarios.
    /// When set, allows Customer to be linked to a member account for login.
    /// </summary>
    public Guid? MemberKey { get; set; }

    /// <summary>
    /// Customer's first name (captured from first invoice billing address)
    /// </summary>
    public string? FirstName { get; set; }

    /// <summary>
    /// Customer's last name (captured from first invoice billing address)
    /// </summary>
    public string? LastName { get; set; }

    /// <summary>
    /// Date the customer record was created (UTC)
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date the customer record was last updated (UTC)
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property: Tags assigned to this customer.
    /// Used for categorization and segment criteria matching.
    /// </summary>
    public virtual ICollection<CustomerTag> CustomerTags { get; set; } = [];

    /// <summary>
    /// Navigation property: Invoices for this customer
    /// </summary>
    public virtual ICollection<Invoice>? Invoices { get; set; }
}
