using Merchello.Core;
using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Tax.Models;
using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Models;
using Merchello.Core.Warehouses.Models;
using Merchello.Tests.Tax.Providers;
using Merchello.Tests.TestInfrastructure;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Tax;

[Collection("Integration Tests")]
public class TaxPipelineOrchestrationIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICheckoutService _checkoutService;
    private readonly IShippingService _shippingService;
    private readonly IInvoiceService _invoiceService;
    private readonly IInvoiceEditService _invoiceEditService;

    public TaxPipelineOrchestrationIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.ResetMocks();

        _checkoutService = fixture.GetService<ICheckoutService>();
        _shippingService = fixture.GetService<IShippingService>();
        _invoiceService = fixture.GetService<IInvoiceService>();
        _invoiceEditService = fixture.GetService<IInvoiceEditService>();
    }

    [Fact]
    public async Task CalculateBasketAsync_ExternalProviderAndMissingCountry_ReturnsEstimatedTax()
    {
        await ConfigureExternalProviderAsync(shouldFail: false);
        var (_, _, product) = await CreateShippingScenarioAsync(productPrice: 100m, countryCode: "GB");
        var basket = await CreateBasketAsync("GB", "USD", (product, 1));

        basket.ShippingAddress.CountryCode = string.Empty;
        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = null,
            ShippingAmountOverride = 10m
        });

        basket.IsTaxEstimated.ShouldBeTrue();
        basket.TaxEstimationReason.ShouldBe("ShippingAddressMissing");
    }

    [Fact]
    public async Task CalculateBasketAsync_ExternalProviderAndAddress_UsesAuthoritativeProviderTax()
    {
        await ConfigureExternalProviderAsync(shouldFail: false, lineRate: 15m, shippingRate: 10m);
        var (_, _, product) = await CreateShippingScenarioAsync(productPrice: 100m, countryCode: "GB");
        var basket = await CreateBasketAsync("GB", "USD", (product, 1));
        basket.ShippingAddress.CountryCode = "GB";

        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = "GB",
            ShippingAmountOverride = 10m
        });

        basket.IsTaxEstimated.ShouldBeFalse();
        basket.Tax.ShouldBe(16m); // 100*15% + 10*10%
    }

    [Fact]
    public async Task CalculateBasketAsync_ExternalProviderFailure_FallsBackToEstimatedTax()
    {
        await ConfigureExternalProviderAsync(shouldFail: true);
        var (_, _, product) = await CreateShippingScenarioAsync(productPrice: 100m, countryCode: "GB");
        var basket = await CreateBasketAsync("GB", "USD", (product, 1));
        basket.ShippingAddress.CountryCode = "GB";

        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = "GB",
            ShippingAmountOverride = 10m
        });

        basket.IsTaxEstimated.ShouldBeTrue();
        basket.TaxEstimationReason.ShouldBe("ProviderUnavailable");
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_ExternalProvider_IsAuthoritativeAndPersistsMetadata()
    {
        await ConfigureExternalProviderAsync(shouldFail: false, lineRate: 12m, shippingRate: 5m);
        var (warehouse, shippingOption, product) = await CreateShippingScenarioAsync(productPrice: 100m, countryCode: "GB");
        var basket = await CreateBasketAsync("GB", "USD", (product, 1));
        var address = CreateAddress("GB", "authoritative@example.com");

        var checkoutSession = await BuildCheckoutSessionAsync(basket, address);
        const decimal selectedShippingCost = 6m;
        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = "GB",
            ShippingAmountOverride = selectedShippingCost
        });

        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();

        var invoice = result.ResultObject!;
        invoice.Tax.ShouldBe(12.3m); // 100*12% + 6*5%
        invoice.ExtendedData[Constants.ExtendedDataKeys.TaxProviderAlias].ShouldBe("deterministic-external");
        invoice.ExtendedData.ContainsKey(Constants.ExtendedDataKeys.TaxProviderTransactionId).ShouldBeTrue();
        Convert.ToBoolean(invoice.ExtendedData[Constants.ExtendedDataKeys.TaxIsEstimated].UnwrapJsonElement()).ShouldBeFalse();
        invoice.ExtendedData.ContainsKey(Constants.ExtendedDataKeys.TaxEstimationReason).ShouldBeFalse();
        invoice.Orders.ShouldNotBeNull();
        invoice.Orders.ShouldContain(o => o.WarehouseId == warehouse.Id);
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_ExternalProviderFailure_FailsClosed()
    {
        await ConfigureExternalProviderAsync(shouldFail: true);
        var (_, _, product) = await CreateShippingScenarioAsync(productPrice: 100m, countryCode: "GB");
        var basket = await CreateBasketAsync("GB", "USD", (product, 1));
        var address = CreateAddress("GB", "failclosed@example.com");
        var checkoutSession = await BuildCheckoutSessionAsync(basket, address);

        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        result.Success.ShouldBeFalse();
        result.Messages.ShouldNotBeNull();
        result.Messages!.Any(m => m.Message?.Contains("Deterministic provider failure.", StringComparison.OrdinalIgnoreCase) == true)
            .ShouldBeTrue();
    }

    [Fact]
    public async Task EditInvoiceAsync_ExternalProviderFailure_FailsClosed()
    {
        await ConfigureExternalProviderAsync(shouldFail: false);
        var (_, _, product) = await CreateShippingScenarioAsync(productPrice: 100m, countryCode: "GB");
        var basket = await CreateBasketAsync("GB", "USD", (product, 1));
        var address = CreateAddress("GB", "editfail@example.com");
        var checkoutSession = await BuildCheckoutSessionAsync(basket, address);
        var createResult = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        createResult.Success.ShouldBeTrue();
        var invoice = createResult.ResultObject!;
        var editableLineItem = invoice.Orders!.SelectMany(o => o.LineItems ?? [])
            .First(li => li.LineItemType == LineItemType.Product);

        await ConfigureExternalProviderAsync(shouldFail: true);

        var editResult = await _invoiceEditService.EditInvoiceAsync(new EditInvoiceParameters
        {
            InvoiceId = invoice.Id,
            Request = new EditInvoiceDto
            {
                LineItems =
                [
                    new EditLineItemDto
                    {
                        Id = editableLineItem.Id,
                        Quantity = editableLineItem.Quantity + 1
                    }
                ],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                ProductsToAdd = [],
                OrderDiscounts = [],
                OrderDiscountCodes = [],
                OrderShippingUpdates = [],
                EditReason = "Fail-closed tax provider test",
                ShouldRemoveTax = false
            },
            AuthorId = Guid.NewGuid(),
            AuthorName = "Tax Test"
        });

        editResult.Success.ShouldBeFalse();
        editResult.ErrorMessage.ShouldNotBeNull();
        editResult.ErrorMessage.ShouldContain("Deterministic provider failure.");
    }

    private async Task ConfigureExternalProviderAsync(
        bool shouldFail,
        decimal lineRate = 15m,
        decimal shippingRate = 10m)
    {
        var configValues = new Dictionary<string, string>
        {
            ["lineRate"] = lineRate.ToString(System.Globalization.CultureInfo.InvariantCulture),
            ["shippingRate"] = shippingRate.ToString(System.Globalization.CultureInfo.InvariantCulture),
            ["shouldFail"] = shouldFail.ToString()
        };

        var provider = new DeterministicExternalTaxProvider();
        var configuration = new TaxProviderConfiguration(configValues);
        await provider.ConfigureAsync(configuration);

        var registered = new RegisteredTaxProvider(
            provider,
            new TaxProviderSetting
            {
                ProviderKey = provider.Metadata.Alias,
                IsEnabled = true
            },
            configuration);

        _fixture.TaxProviderManagerMock
            .Setup(x => x.GetActiveProviderAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(registered);

        _fixture.TaxProviderManagerMock
            .Setup(x => x.GetShippingTaxConfigurationAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ShippingTaxConfigurationResult.ProviderCalculated());
    }

    private async Task<(Warehouse Warehouse, Merchello.Core.Shipping.Models.ShippingOption ShippingOption, Product Product)> CreateShippingScenarioAsync(
        decimal productPrice,
        string countryCode)
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Tax Warehouse", countryCode);
        var shippingOption = dataBuilder.CreateShippingOption("Standard Shipping", warehouse, fixedCost: 6m);
        shippingOption.SetShippingCosts(
        [
            new Merchello.Core.Shipping.Models.ShippingCost
            {
                ShippingOptionId = shippingOption.Id,
                CountryCode = countryCode,
                Cost = 6m
            }
        ]);

        var regions = warehouse.ServiceRegions;
        regions.Add(new WarehouseServiceRegion
        {
            CountryCode = countryCode,
            IsExcluded = false
        });
        warehouse.SetServiceRegions(regions);
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("Standard", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Tax Product Root", taxGroup);
        var product = dataBuilder.CreateProduct("Tax Product", productRoot, productPrice);
        product.Sku = $"TAX-{Guid.NewGuid():N}"[..12];

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 50);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return (warehouse, shippingOption, product);
    }

    private async Task<Basket> CreateBasketAsync(
        string countryCode,
        string currencyCode,
        params (Product Product, int Quantity)[] items)
    {
        var basket = _checkoutService.CreateBasket(currencyCode);
        foreach (var (product, quantity) in items)
        {
            var lineItem = _checkoutService.CreateLineItem(product, quantity);
            await _checkoutService.AddToBasketAsync(basket, lineItem, countryCode);
        }

        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = countryCode
        });

        return basket;
    }

    private async Task<CheckoutSession> BuildCheckoutSessionAsync(Basket basket, Address address)
    {
        var billingAddress = CloneAddress(address);
        var shippingAddress = CloneAddress(address);

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });
        var group = shippingResult.WarehouseGroups.First();
        var selected = group.AvailableShippingOptions.First();

        return new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, string>
            {
                [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selected.ShippingOptionId)
            }
        };
    }

    private static Address CloneAddress(Address source)
    {
        return new Address
        {
            Name = source.Name,
            Company = source.Company,
            AddressOne = source.AddressOne,
            AddressTwo = source.AddressTwo,
            TownCity = source.TownCity,
            PostalCode = source.PostalCode,
            Country = source.Country,
            CountryCode = source.CountryCode,
            Email = source.Email,
            Phone = source.Phone,
            CountyState = new CountyState
            {
                Name = source.CountyState.Name,
                RegionCode = source.CountyState.RegionCode
            }
        };
    }

    private Address CreateAddress(string countryCode, string email)
    {
        var builder = _fixture.CreateDataBuilder();
        return builder.CreateTestAddress(email: email, countryCode: countryCode);
    }
}
