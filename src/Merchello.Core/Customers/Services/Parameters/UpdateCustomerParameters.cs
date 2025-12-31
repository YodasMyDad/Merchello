namespace Merchello.Core.Customers.Services.Parameters;

/// <summary>
/// Parameters for updating an existing customer.
/// </summary>
public class UpdateCustomerParameters
{
    /// <summary>
    /// Customer ID (required)
    /// </summary>
    public required Guid Id { get; set; }

    /// <summary>
    /// Customer's email address. Must be unique across all customers.
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Customer's first name
    /// </summary>
    public string? FirstName { get; set; }

    /// <summary>
    /// Customer's last name
    /// </summary>
    public string? LastName { get; set; }

    /// <summary>
    /// Optional Umbraco Member key for account linking.
    /// Set to a value to link, or use ClearMemberKey to unlink.
    /// </summary>
    public Guid? MemberKey { get; set; }

    /// <summary>
    /// When true, clears the MemberKey (unlinks from member).
    /// </summary>
    public bool ClearMemberKey { get; set; }

    /// <summary>
    /// Tags to assign to this customer. Replaces all existing tags.
    /// </summary>
    public List<string>? Tags { get; set; }

    /// <summary>
    /// Flag to identify problem customers. Null = unchanged.
    /// </summary>
    public bool? IsFlagged { get; set; }

    /// <summary>
    /// Whether the customer accepts marketing. Null = unchanged.
    /// </summary>
    public bool? AcceptsMarketing { get; set; }
}
