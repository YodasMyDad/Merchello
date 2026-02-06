using Merchello.Core.Locality.Models;

namespace Merchello.Core.Locality.Factories;

public class AddressFactory
{
    public Address CreateCountryOnly(string countryCode, string? regionCode = null)
    {
        return new Address
        {
            CountryCode = countryCode,
            CountyState = new CountyState { RegionCode = regionCode, Name = regionCode }
        };
    }

    public Address CreateAddress(
        string? name,
        string? addressOne,
        string? addressTwo,
        string? townCity,
        string? postalCode,
        string? countryCode,
        string? countyState,
        string? regionCode = null,
        string? company = null,
        string? phone = null,
        string? email = null)
    {
        return new Address
        {
            Name = name,
            Company = company,
            AddressOne = addressOne,
            AddressTwo = addressTwo,
            TownCity = townCity,
            PostalCode = postalCode,
            CountryCode = countryCode,
            CountyState = new CountyState
            {
                Name = countyState,
                RegionCode = regionCode ?? countyState
            },
            Phone = phone,
            Email = email
        };
    }

    public Address CreateFromFormData(
        string firstName,
        string lastName,
        string address1,
        string? address2,
        string city,
        string postalCode,
        string countryCode,
        string? regionCode = null,
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
            CountyState = new CountyState { RegionCode = regionCode },
            Phone = phone,
            Email = email
        };
    }
}

