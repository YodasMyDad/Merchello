using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Customers.Factories;

/// <summary>
/// Factory for creating Customer instances.
/// </summary>
public class CustomerFactory
{
    /// <summary>
    /// Creates a new Customer from an email address (minimal creation during checkout).
    /// </summary>
    /// <param name="email">Customer email address.</param>
    /// <param name="billingAddress">Optional billing address to extract name from.</param>
    /// <param name="acceptsMarketing">Whether the customer accepts marketing communications.</param>
    public Customer CreateFromEmail(string email, Address? billingAddress = null, bool acceptsMarketing = false)
    {
        var now = DateTime.UtcNow;
        return new Customer
        {
            Id = GuidExtensions.NewSequentialGuid,
            Email = email.Trim().ToLowerInvariant(),
            FirstName = ExtractFirstName(billingAddress?.Name),
            LastName = ExtractLastName(billingAddress?.Name),
            AcceptsMarketing = acceptsMarketing,
            DateCreated = now,
            DateUpdated = now
        };
    }

    /// <summary>
    /// Creates a new Customer from explicit parameters.
    /// </summary>
    public Customer Create(CreateCustomerParameters parameters)
    {
        var now = DateTime.UtcNow;
        return new Customer
        {
            Id = GuidExtensions.NewSequentialGuid,
            Email = parameters.Email.Trim().ToLowerInvariant(),
            MemberKey = parameters.MemberKey,
            FirstName = parameters.FirstName,
            LastName = parameters.LastName,
            DateCreated = now,
            DateUpdated = now
        };
    }

    private static string? ExtractFirstName(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName)) return null;
        var parts = fullName.Trim().Split(' ', 2);
        return parts.Length > 0 ? parts[0] : null;
    }

    private static string? ExtractLastName(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName)) return null;
        var parts = fullName.Trim().Split(' ', 2);
        return parts.Length > 1 ? parts[1] : null;
    }
}
