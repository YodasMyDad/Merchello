namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Response from saving checkout addresses.
/// </summary>
public class SaveAddressesResponseDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public Dictionary<string, string>? Errors { get; set; }

    /// <summary>
    /// The updated basket with recalculated totals and any automatic discounts applied.
    /// </summary>
    public CheckoutBasketDto? Basket { get; set; }
}
