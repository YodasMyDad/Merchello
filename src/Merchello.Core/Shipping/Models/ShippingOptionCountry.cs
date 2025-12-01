using Merchello.Core.Locality.Models;

namespace Merchello.Core.Shipping.Models;

public class ShippingOptionCountry
{
    public Guid ShippingOptionId { get; set; }
    public ShippingOption ShippingOption { get; set; } = null!;

    public string CountryCode { get; set; } = null!; // ISO country code
    public Country Country { get; set; } = null!;
}
