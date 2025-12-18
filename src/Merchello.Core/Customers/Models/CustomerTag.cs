using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Customers.Models;

/// <summary>
/// Represents a tag assigned to a customer.
/// Used for categorization and segment criteria matching.
/// </summary>
public class CustomerTag
{
    /// <summary>
    /// Unique identifier for the tag assignment.
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The customer this tag belongs to.
    /// </summary>
    public Guid CustomerId { get; set; }

    /// <summary>
    /// The tag value (e.g., "VIP", "Wholesale", "Beta Tester").
    /// </summary>
    public string Tag { get; set; } = string.Empty;

    /// <summary>
    /// When this tag was added to the customer (UTC).
    /// </summary>
    public DateTime DateAdded { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property: The customer this tag belongs to.
    /// </summary>
    public virtual Customer Customer { get; set; } = null!;
}
