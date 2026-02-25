using Merchello.Core;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Locality.Models;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Storefront.Services;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Providers.Models;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Parameters;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Storefront.Services;

public class StorefrontContextServiceTests
{
    [Fact]
    public async Task SetShippingCountry_ThenGetCurrencyAsync_UsesMappedCurrencyInSameRequest()
    {
        var httpContextAccessor = new HttpContextAccessor { HttpContext = new DefaultHttpContext() };
        SetRequestCookies(httpContextAccessor.HttpContext!, (Constants.Cookies.Currency, "USD"));

        var countryCurrencyMapping = new Mock<ICountryCurrencyMappingService>();
        countryCurrencyMapping
            .Setup(x => x.GetCurrencyForCountry(It.IsAny<string>()))
            .Returns((string countryCode) =>
                countryCode.Equals("GB", StringComparison.OrdinalIgnoreCase) ? "GBP" : "USD");

        var service = CreateService(httpContextAccessor, countryCurrencyMapping: countryCurrencyMapping);

        service.SetShippingCountry("GB");

        var currency = await service.GetCurrencyAsync();
        currency.CurrencyCode.ShouldBe("GBP");
    }

    [Fact]
    public async Task SetShippingCountry_ThenGetShippingLocationAsync_UsesUpdatedLocationInSameRequest()
    {
        var httpContextAccessor = new HttpContextAccessor { HttpContext = new DefaultHttpContext() };
        SetRequestCookies(
            httpContextAccessor.HttpContext!,
            (Constants.Cookies.ShippingCountry, "US"),
            (Constants.Cookies.ShippingRegion, "CA"));

        var service = CreateService(httpContextAccessor);

        service.SetShippingCountry("GB", "ENG");

        var location = await service.GetShippingLocationAsync();
        location.CountryCode.ShouldBe("GB");
        location.RegionCode.ShouldBe("ENG");
        location.CountryName.ShouldBe("United Kingdom");
        location.RegionName.ShouldBe("England");
    }

    [Fact]
    public async Task SetCurrency_InvalidatesDisplayContextCache_ForSameRequestRead()
    {
        var httpContextAccessor = new HttpContextAccessor { HttpContext = new DefaultHttpContext() };
        SetRequestCookies(
            httpContextAccessor.HttpContext!,
            (Constants.Cookies.Currency, "USD"),
            (Constants.Cookies.ShippingCountry, "US"));

        var service = CreateService(httpContextAccessor);

        var initialContext = await service.GetDisplayContextAsync();
        initialContext.CurrencyCode.ShouldBe("USD");
        initialContext.ExchangeRate.ShouldBe(1m);

        service.SetCurrency("GBP");

        var updatedContext = await service.GetDisplayContextAsync();
        updatedContext.CurrencyCode.ShouldBe("GBP");
        updatedContext.ExchangeRate.ShouldBe(0.8m);
    }

    private static StorefrontContextService CreateService(
        IHttpContextAccessor httpContextAccessor,
        Mock<ICountryCurrencyMappingService>? countryCurrencyMapping = null)
    {
        var settings = Options.Create(new MerchelloSettings
        {
            StoreCurrencyCode = "USD",
            DefaultShippingCountry = "US",
            DisplayPricesIncTax = false
        });

        var locationsService = new Mock<ILocationsService>();
        locationsService
            .Setup(x => x.GetAvailableCountriesAsync(
                It.IsAny<GetAvailableCountriesParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new CountryAvailability("US", "United States"),
                new CountryAvailability("GB", "United Kingdom")
            ]);

        var localityCatalog = new Mock<ILocalityCatalog>();
        localityCatalog
            .Setup(x => x.GetCountriesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new CountryInfo("US", "United States"),
                new CountryInfo("GB", "United Kingdom")
            ]);
        localityCatalog
            .Setup(x => x.GetRegionsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns((string countryCode, CancellationToken _) =>
            {
                IReadOnlyCollection<SubdivisionInfo> regions = countryCode.Equals("GB", StringComparison.OrdinalIgnoreCase)
                    ? [new SubdivisionInfo("GB", "ENG", "England")]
                    : [];
                return Task.FromResult(regions);
            });

        var currencyService = new Mock<ICurrencyService>();
        currencyService
            .Setup(x => x.GetCurrency(It.IsAny<string>()))
            .Returns((string currencyCode) =>
                new CurrencyInfo(currencyCode.ToUpperInvariant(), currencyCode.ToUpperInvariant(), 2, true));
        currencyService
            .Setup(x => x.GetCurrency(It.Is<string>(c => c.Equals("USD", StringComparison.OrdinalIgnoreCase))))
            .Returns(new CurrencyInfo("USD", "$", 2, true));
        currencyService
            .Setup(x => x.GetCurrency(It.Is<string>(c => c.Equals("GBP", StringComparison.OrdinalIgnoreCase))))
            .Returns(new CurrencyInfo("GBP", "GBP", 2, true));

        var exchangeRateCache = new Mock<IExchangeRateCache>();
        exchangeRateCache
            .Setup(x => x.GetRateAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((string fromCurrency, string toCurrency, CancellationToken _) =>
                fromCurrency.Equals(toCurrency, StringComparison.OrdinalIgnoreCase) ? 1m : 0.8m);

        var taxProviderManager = new Mock<ITaxProviderManager>();
        taxProviderManager
            .Setup(x => x.GetShippingTaxConfigurationAsync(
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(ShippingTaxConfigurationResult.NotTaxed());

        countryCurrencyMapping ??= new Mock<ICountryCurrencyMappingService>();
        countryCurrencyMapping
            .Setup(x => x.GetCurrencyForCountry(It.IsAny<string>()))
            .Returns((string countryCode) =>
                countryCode.Equals("GB", StringComparison.OrdinalIgnoreCase) ? "GBP" : "USD");

        return new StorefrontContextService(
            httpContextAccessor,
            settings,
            locationsService.Object,
            localityCatalog.Object,
            currencyService.Object,
            countryCurrencyMapping.Object,
            exchangeRateCache.Object,
            Mock.Of<ICheckoutService>(),
            Mock.Of<IProductService>(),
            taxProviderManager.Object,
            Mock.Of<IShippingOptionEligibilityService>());
    }

    private static void SetRequestCookies(HttpContext httpContext, params (string Name, string Value)[] cookies)
    {
        httpContext.Request.Headers.Cookie = string.Join("; ", cookies.Select(x => $"{x.Name}={x.Value}"));
    }
}
