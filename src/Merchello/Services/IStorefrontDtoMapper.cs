using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Storefront.Dtos;
using Merchello.Core.Storefront.Models;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Services;

/// <summary>
/// Maps storefront domain models to API/view DTOs.
/// </summary>
public interface IStorefrontDtoMapper
{
    BasketOperationResultDto MapBasketOperationResult(
        bool success,
        string? message,
        Basket? basket,
        string storeCurrencySymbol);

    BasketCountDto MapBasketCount(Basket? basket, string storeCurrencySymbol);

    StorefrontBasketDto MapBasket(
        Basket? basket,
        StorefrontDisplayContext displayContext,
        string storeCurrencySymbol,
        BasketLocationAvailability? availability = null);

    ShippingCountriesDto MapShippingCountries(
        IReadOnlyCollection<CountryAvailability> countries,
        ShippingLocation currentLocation,
        StorefrontCurrency currency);

    StorefrontCurrencyDto MapCurrency(StorefrontCurrency currency);

    SetCountryResultDto MapSetCountryResult(CountryAvailability country, StorefrontCurrency currency);

    List<RegionDto> MapRegions(string countryCode, IReadOnlyCollection<RegionAvailability> regions);

    StorefrontContextDto MapStorefrontContext(
        ShippingLocation currentLocation,
        StorefrontCurrency currency,
        Basket? basket,
        string storeCurrencySymbol);

    ProductAvailabilityDto MapProductAvailability(ProductLocationAvailability availability);

    BasketAvailabilityDto MapBasketAvailability(BasketLocationAvailability availability);

    EstimatedShippingDto MapEstimatedShippingFailure(string? message);

    EstimatedShippingDto MapEstimatedShippingSuccess(
        GetEstimatedShippingResult result,
        Basket basket,
        StorefrontDisplayContext displayContext,
        string storeCurrencySymbol);
}
