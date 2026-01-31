using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Products.Extensions;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Models;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Products;

public class TaxInclusiveDisplayTests
{
    private readonly ICurrencyService _currencyService;
    private readonly Mock<ITaxService> _taxServiceMock;
    private readonly TaxGroupFactory _taxGroupFactory = new();
    private readonly ProductTypeFactory _productTypeFactory = new();
    private readonly ProductRootFactory _productRootFactory = new();
    private readonly ProductFactory _productFactory = new(new SlugHelper());

    public TaxInclusiveDisplayTests()
    {
        var settings = Options.Create(new MerchelloSettings { DefaultRounding = MidpointRounding.AwayFromZero });
        _currencyService = new CurrencyService(settings);
        _taxServiceMock = new Mock<ITaxService>();
    }

    [Fact]
    public async Task GetDisplayPriceAsync_WhenDisplayPricesIncTaxFalse_ReturnsNetPrice()
    {
        // Arrange
        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "GBP",
            CurrencySymbol: "£",
            DecimalPlaces: 2,
            ExchangeRate: 1.0m,
            StoreCurrencyCode: "GBP",
            DisplayPricesIncTax: false,
            TaxCountryCode: "GB",
            TaxRegionCode: null);

        var (product, taxGroupId) = CreateProduct(price: 100.00m);

        // Act
        var result = await product.GetDisplayPriceAsync(displayContext, _taxServiceMock.Object, _currencyService);

        // Assert
        result.Amount.ShouldBe(100.00m);
        result.IncludesTax.ShouldBeFalse();
        result.TaxRate.ShouldBe(0);
        result.TaxAmount.ShouldBe(0);
    }

    [Fact]
    public async Task GetDisplayPriceAsync_WhenDisplayPricesIncTaxTrue_AppliesTax()
    {
        // Arrange
        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "GBP",
            CurrencySymbol: "£",
            DecimalPlaces: 2,
            ExchangeRate: 1.0m,
            StoreCurrencyCode: "GBP",
            DisplayPricesIncTax: true,
            TaxCountryCode: "GB",
            TaxRegionCode: null);

        var (product, taxGroupId) = CreateProduct(price: 100.00m);

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(taxGroupId, "GB", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(20m); // 20% VAT

        // Act
        var result = await product.GetDisplayPriceAsync(displayContext, _taxServiceMock.Object, _currencyService);

        // Assert
        result.Amount.ShouldBe(120.00m); // £100 + 20% = £120
        result.IncludesTax.ShouldBeTrue();
        result.TaxRate.ShouldBe(20);
        result.TaxAmount.ShouldBe(20.00m);
    }

    [Fact]
    public async Task GetDisplayPriceAsync_WithSalePrice_CalculatesBothPrices()
    {
        // Arrange
        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "GBP",
            CurrencySymbol: "£",
            DecimalPlaces: 2,
            ExchangeRate: 1.0m,
            StoreCurrencyCode: "GBP",
            DisplayPricesIncTax: true,
            TaxCountryCode: "GB",
            TaxRegionCode: null);

        var (product, taxGroupId) = CreateProduct(price: 80.00m, onSale: true, previousPrice: 100.00m);

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(taxGroupId, "GB", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(20m);

        // Act
        var result = await product.GetDisplayPriceAsync(displayContext, _taxServiceMock.Object, _currencyService);

        // Assert
        result.Amount.ShouldBe(96.00m);            // £80 + 20% = £96
        result.CompareAtAmount.ShouldBe(120.00m);  // £100 + 20% = £120
        result.IncludesTax.ShouldBeTrue();
    }

    [Fact]
    public async Task GetDisplayPriceAsync_WithCurrencyConversion_AppliesExchangeRate()
    {
        // Arrange
        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "USD",
            CurrencySymbol: "$",
            DecimalPlaces: 2,
            ExchangeRate: 1.25m,  // £1 = $1.25
            StoreCurrencyCode: "GBP",
            DisplayPricesIncTax: true,
            TaxCountryCode: "US",
            TaxRegionCode: null);

        var (product, taxGroupId) = CreateProduct(price: 100.00m);

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(taxGroupId, "US", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(10m); // 10% US tax

        // Act
        var result = await product.GetDisplayPriceAsync(displayContext, _taxServiceMock.Object, _currencyService);

        // Assert
        // £100 * 1.10 (10% tax) * 1.25 (exchange rate) = $137.50
        result.Amount.ShouldBe(137.50m);
        result.CurrencyCode.ShouldBe("USD");
        result.CurrencySymbol.ShouldBe("$");
    }

    [Fact]
    public async Task GetDisplayPriceAsync_WithZeroTaxCountry_ShowsIncludesTaxFalse()
    {
        // Arrange
        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "GBP",
            CurrencySymbol: "£",
            DecimalPlaces: 2,
            ExchangeRate: 1.0m,
            StoreCurrencyCode: "GBP",
            DisplayPricesIncTax: true,
            TaxCountryCode: "US",  // Tax exempt country
            TaxRegionCode: "DE");   // Delaware (no sales tax)

        var (product, taxGroupId) = CreateProduct(price: 100.00m);

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(taxGroupId, "US", "DE", It.IsAny<CancellationToken>()))
            .ReturnsAsync(0m); // 0% tax

        // Act
        var result = await product.GetDisplayPriceAsync(displayContext, _taxServiceMock.Object, _currencyService);

        // Assert
        result.Amount.ShouldBe(100.00m);
        result.IncludesTax.ShouldBeFalse();  // False because tax rate is 0
        result.TaxRate.ShouldBe(0);
    }

    [Fact]
    public void GetDisplayPriceAdjustment_WhenDisplayPricesIncTaxTrue_AppliesTax()
    {
        // Arrange
        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "GBP",
            CurrencySymbol: "£",
            DecimalPlaces: 2,
            ExchangeRate: 1.0m,
            StoreCurrencyCode: "GBP",
            DisplayPricesIncTax: true,
            TaxCountryCode: "GB",
            TaxRegionCode: null);

        // Act
        var result = DisplayPriceExtensions.GetDisplayPriceAdjustment(
            priceAdjustment: 10.00m,
            displayContext: displayContext,
            taxRate: 20m,
            currencyService: _currencyService);

        // Assert
        result.ShouldBe(12.00m); // £10 + 20% = £12
    }

    [Fact]
    public void GetDisplayPriceAdjustment_WhenDisplayPricesIncTaxFalse_ReturnsNetPrice()
    {
        // Arrange
        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "GBP",
            CurrencySymbol: "£",
            DecimalPlaces: 2,
            ExchangeRate: 1.0m,
            StoreCurrencyCode: "GBP",
            DisplayPricesIncTax: false,
            TaxCountryCode: "GB",
            TaxRegionCode: null);

        // Act
        var result = DisplayPriceExtensions.GetDisplayPriceAdjustment(
            priceAdjustment: 10.00m,
            displayContext: displayContext,
            taxRate: 20m,
            currencyService: _currencyService);

        // Assert
        result.ShouldBe(10.00m); // Net price, no tax applied
    }

    [Fact]
    public void GetDisplayPriceAdjustment_WithNegativeAdjustment_HandlesProperly()
    {
        // Arrange
        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "GBP",
            CurrencySymbol: "£",
            DecimalPlaces: 2,
            ExchangeRate: 1.0m,
            StoreCurrencyCode: "GBP",
            DisplayPricesIncTax: true,
            TaxCountryCode: "GB",
            TaxRegionCode: null);

        // Act
        var result = DisplayPriceExtensions.GetDisplayPriceAdjustment(
            priceAdjustment: -5.00m,
            displayContext: displayContext,
            taxRate: 20m,
            currencyService: _currencyService);

        // Assert
        result.ShouldBe(-6.00m); // -£5 * 1.20 = -£6
    }

    [Fact]
    public void GetDisplayPriceAdjustment_WithZeroAdjustment_ReturnsZero()
    {
        // Arrange
        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "GBP",
            CurrencySymbol: "£",
            DecimalPlaces: 2,
            ExchangeRate: 1.0m,
            StoreCurrencyCode: "GBP",
            DisplayPricesIncTax: true,
            TaxCountryCode: "GB",
            TaxRegionCode: null);

        // Act
        var result = DisplayPriceExtensions.GetDisplayPriceAdjustment(
            priceAdjustment: 0m,
            displayContext: displayContext,
            taxRate: 20m,
            currencyService: _currencyService);

        // Assert
        result.ShouldBe(0m);
    }

    [Fact]
    public async Task GetDisplayPriceAsync_WithJpyCurrency_RoundsToZeroDecimals()
    {
        // Arrange
        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "JPY",
            CurrencySymbol: "¥",
            DecimalPlaces: 0,
            ExchangeRate: 150m,  // £1 = ¥150
            StoreCurrencyCode: "GBP",
            DisplayPricesIncTax: true,
            TaxCountryCode: "JP",
            TaxRegionCode: null);

        var (product, taxGroupId) = CreateProduct(price: 100.00m);

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(taxGroupId, "JP", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(10m); // 10% Japanese consumption tax

        // Act
        var result = await product.GetDisplayPriceAsync(displayContext, _taxServiceMock.Object, _currencyService);

        // Assert
        // £100 * 1.10 * 150 = ¥16,500
        result.Amount.ShouldBe(16500m);
        result.DecimalPlaces.ShouldBe(0);
    }

    private (Product Product, Guid TaxGroupId) CreateProduct(decimal price, bool onSale = false, decimal? previousPrice = null)
    {
        var taxGroup = _taxGroupFactory.Create("Test Tax", 0m);
        taxGroup.Id = Guid.NewGuid();

        var productType = _productTypeFactory.Create("Test Type", "test-type");
        var productRoot = _productRootFactory.Create("Test Root", taxGroup, productType, []);
        var product = _productFactory.Create(
            productRoot,
            "Test Product",
            price,
            costOfGoods: 0m,
            gtin: string.Empty,
            sku: $"SKU-{Guid.NewGuid():N}"[..12],
            isDefault: true);

        product.Id = Guid.NewGuid();
        product.ProductRootId = productRoot.Id;
        product.ProductRoot = productRoot;
        product.OnSale = onSale;
        product.PreviousPrice = previousPrice;

        return (product, taxGroup.Id);
    }
}
