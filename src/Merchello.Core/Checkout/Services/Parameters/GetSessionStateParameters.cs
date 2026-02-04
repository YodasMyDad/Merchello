namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for loading checkout protocol session state.
/// </summary>
public class GetSessionStateParameters
{
    /// <summary>
    /// Basket identifier.
    /// </summary>
    public required Guid BasketId { get; init; }
}
