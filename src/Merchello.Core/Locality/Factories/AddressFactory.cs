using Merchello.Core.Locality.Models;

namespace Merchello.Core.Locality.Factories;

public class AddressFactory
{
    public Address CreateFromFormData(
        string firstName,
        string lastName,
        string address1,
        string? address2,
        string city,
        string postalCode,
        string countryCode,
        string? stateOrProvinceCode = null,
        string? phone = null,
        string? email = null)
    {
        return new Address
        {
            Name = $"{firstName} {lastName}",
            AddressOne = address1,
            AddressTwo = address2,
            TownCity = city,
            PostalCode = postalCode,
            CountryCode = countryCode,
            CountyState = new CountyState { RegionCode = stateOrProvinceCode },
            Phone = phone,
            Email = email
        };
    }
}

