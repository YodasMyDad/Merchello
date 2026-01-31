using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Customers.Models;

public class CustomerAddress
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid CustomerId { get; set; }
    public string? Label { get; set; }
    public AddressType AddressType { get; set; } = AddressType.Both;
    public bool IsDefault { get; set; }

    // Address fields
    public string? Name { get; set; }
    public string? Company { get; set; }
    public string? AddressOne { get; set; }
    public string? AddressTwo { get; set; }
    public string? TownCity { get; set; }
    public string? CountyState { get; set; }
    public string? CountyStateCode { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? CountryCode { get; set; }
    public string? Phone { get; set; }

    // Timestamps
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual Customer? Customer { get; set; }
}
