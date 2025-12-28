namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Address DTO for checkout forms.
/// </summary>
public class CheckoutAddressDto
{
    public string? Name { get; set; }
    public string? Company { get; set; }
    public string? Address1 { get; set; }
    public string? Address2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? StateCode { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? CountryCode { get; set; }
    public string? Phone { get; set; }
}
