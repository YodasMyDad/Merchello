using Merchello.Core.Checkout.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Checkout.Factories;

/// <summary>
/// Factory for creating Basket instances.
/// </summary>
public class BasketFactory
{
    /// <summary>
    /// Creates a new basket with the specified parameters.
    /// </summary>
    /// <param name="customerId">Optional customer ID if user is logged in.</param>
    /// <param name="currencyCode">The currency code for the basket.</param>
    /// <param name="currencySymbol">The currency symbol for display.</param>
    /// <returns>A new Basket instance.</returns>
    public Basket Create(Guid? customerId, string currencyCode, string currencySymbol)
    {
        var now = DateTime.UtcNow;
        return new Basket
        {
            Id = GuidExtensions.NewSequentialGuid,
            CustomerId = customerId,
            Currency = currencyCode,
            CurrencySymbol = currencySymbol,
            DateCreated = now,
            DateUpdated = now
        };
    }
}
