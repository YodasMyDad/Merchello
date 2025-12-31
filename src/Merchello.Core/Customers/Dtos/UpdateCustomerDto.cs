namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// DTO for updating a customer
/// </summary>
public class UpdateCustomerDto
{
    /// <summary>
    /// Customer's email address. Must be unique across all customers.
    /// </summary>
    public string? Email { get; set; }

    public string? FirstName { get; set; }
    public string? LastName { get; set; }

    /// <summary>
    /// Optional Umbraco Member key to link to this customer.
    /// Pass null to clear the link, or omit to leave unchanged.
    /// </summary>
    public Guid? MemberKey { get; set; }

    /// <summary>
    /// When true, explicitly clears the MemberKey (sets to null).
    /// This differentiates between "not provided" and "set to null".
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
