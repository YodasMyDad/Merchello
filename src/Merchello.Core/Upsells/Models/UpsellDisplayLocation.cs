namespace Merchello.Core.Upsells.Models;

/// <summary>
/// Where upsell suggestions are displayed. Flags enum so a single rule can target multiple locations.
/// Serialized as an integer so the frontend can use bitwise operations.
/// </summary>
[Flags]
public enum UpsellDisplayLocation
{
    None = 0,
    Checkout = 1,
    Basket = 2,
    ProductPage = 4,
    Email = 8,
    Confirmation = 16,
    All = Checkout | Basket | ProductPage | Email | Confirmation
}
