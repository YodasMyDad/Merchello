namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Fields available for ordering abandoned checkout results.
/// </summary>
public enum AbandonedCheckoutOrderBy
{
    DateAbandoned,
    LastActivity,
    Total,
    Email
}
