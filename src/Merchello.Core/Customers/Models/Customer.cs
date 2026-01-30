using Merchello.Core.Accounting.Models;
using Merchello.Core.Payments.Models;
using Merchello.Core.Shared.Extensions;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

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
    /// Flag to identify problem customers requiring attention.
    /// </summary>
    public bool IsFlagged { get; set; }

    /// <summary>
    /// Whether the customer has opted in to receive marketing communications.
    /// </summary>
    public bool AcceptsMarketing { get; set; }

    /// <summary>
    /// Whether this customer can order on account with payment terms.
    /// When true, invoices will have DueDate set based on PaymentTermsDays.
    /// </summary>
    public bool HasAccountTerms { get; set; }

    /// <summary>
    /// Payment terms in days (e.g., 30 for Net 30, 60 for Net 60).
    /// Only applies when HasAccountTerms is true.
    /// </summary>
    public int? PaymentTermsDays { get; set; }

    /// <summary>
    /// Optional credit limit for the customer's outstanding balance.
    /// Soft warning only - orders still proceed if exceeded.
    /// </summary>
    public decimal? CreditLimit { get; set; }

    /// <summary>
    /// Navigation property: Tags assigned to this customer.
    /// Used for categorization and segment criteria matching.
    /// </summary>
    public string? TagsJson { get; set; }

    /// <summary>
    /// Navigation property: Invoices for this customer
    /// </summary>
    public virtual ICollection<Invoice>? Invoices { get; set; }

    /// <summary>
    /// Navigation property: Saved payment methods for this customer (vaulted at payment providers).
    /// </summary>
    public virtual ICollection<SavedPaymentMethod>? SavedPaymentMethods { get; set; }

    [NotMapped]
    public List<string> Tags =>
        string.IsNullOrEmpty(TagsJson) ? [] :
        JsonSerializer.Deserialize<List<string>>(TagsJson) ?? [];

    public void SetTags(List<string>? tags) =>
        TagsJson = tags is { Count: > 0 } ? JsonSerializer.Serialize(tags) : null;
}
