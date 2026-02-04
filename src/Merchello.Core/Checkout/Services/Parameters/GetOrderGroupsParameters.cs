using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for resolving checkout order groups.
/// </summary>
public class GetOrderGroupsParameters
{
    /// <summary>
    /// Basket to group.
    /// </summary>
    public required Basket Basket { get; init; }

    /// <summary>
    /// Checkout session containing addresses and previous selections.
    /// </summary>
    public required CheckoutSession Session { get; init; }
}
