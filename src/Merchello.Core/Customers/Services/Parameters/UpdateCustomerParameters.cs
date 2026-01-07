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

    /// <summary>
    /// Whether this customer can order on account with payment terms. Null = unchanged.
    /// </summary>
    public bool? HasAccountTerms { get; set; }

    /// <summary>
    /// Payment terms in days (e.g., 30 for Net 30). Null = unchanged.
    /// Use ClearPaymentTermsDays to explicitly remove.
    /// </summary>
    public int? PaymentTermsDays { get; set; }

    /// <summary>
    /// When true, clears the PaymentTermsDays (sets to null).
    /// </summary>
    public bool ClearPaymentTermsDays { get; set; }

    /// <summary>
    /// Credit limit for the customer. Null = unchanged.
    /// Use ClearCreditLimit to explicitly remove.
    /// </summary>
    public decimal? CreditLimit { get; set; }

    /// <summary>
    /// When true, clears the CreditLimit (sets to null).
    /// </summary>
    public bool ClearCreditLimit { get; set; }
}
