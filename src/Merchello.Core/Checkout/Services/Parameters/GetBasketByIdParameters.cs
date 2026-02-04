namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for loading a basket by identifier.
/// </summary>
public class GetBasketByIdParameters
{
    /// <summary>
    /// Basket identifier.
    /// </summary>
    public required Guid BasketId { get; init; }
}
