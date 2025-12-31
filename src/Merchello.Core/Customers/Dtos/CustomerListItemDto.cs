namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Customer list item for the admin backoffice grid view
/// </summary>
public class CustomerListItemDto
{
    public Guid Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    /// <summary>
    /// Optional linked Umbraco Member key
    /// </summary>
    public Guid? MemberKey { get; set; }

    public DateTime DateCreated { get; set; }

    public int OrderCount { get; set; }

    /// <summary>
    /// Tags assigned to this customer
    /// </summary>
    public List<string> Tags { get; set; } = [];

    /// <summary>
    /// Flag to identify problem customers requiring attention
    /// </summary>
    public bool IsFlagged { get; set; }

    /// <summary>
    /// Whether the customer has opted in to receive marketing communications
    /// </summary>
    public bool AcceptsMarketing { get; set; }
}
