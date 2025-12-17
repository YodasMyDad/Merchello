namespace Merchello.Core.Customers.Services.Parameters;

/// <summary>
/// Parameters for creating a new customer.
/// </summary>
public class CreateCustomerParameters
{
    /// <summary>
    /// Email address (required, must be unique)
    /// </summary>
    public required string Email { get; set; }

    /// <summary>
    /// Optional Umbraco Member key for account linking
    /// </summary>
    public Guid? MemberKey { get; set; }

    /// <summary>
    /// Customer's first name
    /// </summary>
    public string? FirstName { get; set; }

    /// <summary>
    /// Customer's last name
    /// </summary>
    public string? LastName { get; set; }
}
