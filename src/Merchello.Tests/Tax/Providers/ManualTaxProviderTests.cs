using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Locality.Models;
using Merchello.Core.Tax.Providers.BuiltIn;
using Merchello.Core.Tax.Providers.Models;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Tax.Providers;

/// <summary>
/// Tests for the ManualTaxProvider which calculates tax rates using the TaxGroup/TaxGroupRate system.
/// </summary>
public class ManualTaxProviderTests
{
    private readonly Mock<ITaxService> _taxServiceMock = new();
    private readonly ManualTaxProvider _provider;

    public ManualTaxProviderTests()
    {
        _provider = new ManualTaxProvider(_taxServiceMock.Object);
    }

    [Fact]
    public void Metadata_HasCorrectAlias()
    {
        _provider.Metadata.Alias.ShouldBe("manual");
    }

    [Fact]
    public void Metadata_HasCorrectDisplayName()
    {
        _provider.Metadata.DisplayName.ShouldBe("Manual Tax Rates");
    }

    [Fact]
    public void Metadata_DoesNotRequireApiCredentials()
    {
        _provider.Metadata.RequiresApiCredentials.ShouldBeFalse();
    }

    [Fact]
    public void Metadata_DoesNotSupportRealTimeCalculation()
    {
        _provider.Metadata.SupportsRealTimeCalculation.ShouldBeFalse();
    }

    [Fact]
    public async Task GetConfigurationFieldsAsync_ReturnsEmpty()
    {
        // The manual provider requires no configuration
        var fields = await _provider.GetConfigurationFieldsAsync();

        fields.ShouldBeEmpty();
    }

    [Fact]
    public async Task CalculateTaxAsync_WithTaxGroup_AppliesCorrectRate()
    {
        // Arrange
        var taxGroupId = Guid.NewGuid();
        var request = new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress("US", "CA"),
            CurrencyCode = "USD",
            LineItems =
            [
                new TaxableLineItem
                {
                    Sku = "TEST-001",
                    Name = "Test Product",
                    Amount = 100m,
                    Quantity = 1,
                    TaxGroupId = taxGroupId
                }
            ]
        };

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(taxGroupId, "US", "CA", It.IsAny<CancellationToken>()))
            .ReturnsAsync(8.25m); // 8.25% California tax rate

        // Act
        var result = await _provider.CalculateTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalTax.ShouldBe(8.25m); // 100 * 8.25%
        result.LineResults.ShouldHaveSingleItem();
        result.LineResults[0].TaxRate.ShouldBe(8.25m);
        result.LineResults[0].TaxAmount.ShouldBe(8.25m);
    }

    [Fact]
    public async Task CalculateTaxAsync_WithoutTaxGroup_AppliesZeroRate()
    {
        // Arrange
        var request = new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress("US", "CA"),
            CurrencyCode = "USD",
            LineItems =
            [
                new TaxableLineItem
                {
                    Sku = "TEST-001",
                    Name = "Test Product",
                    Amount = 100m,
                    Quantity = 1,
                    TaxGroupId = null // No tax group
                }
            ]
        };

        // Act
        var result = await _provider.CalculateTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalTax.ShouldBe(0m);
        result.LineResults.ShouldHaveSingleItem();
        result.LineResults[0].TaxRate.ShouldBe(0m);
        result.LineResults[0].TaxAmount.ShouldBe(0m);
    }

    [Fact]
    public async Task CalculateTaxAsync_MultipleItems_CalculatesCorrectTotal()
    {
        // Arrange
        var taxGroupId = Guid.NewGuid();
        var request = new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress("US", "NY"),
            CurrencyCode = "USD",
            LineItems =
            [
                new TaxableLineItem
                {
                    Sku = "ITEM-1",
                    Name = "Item 1",
                    Amount = 50m,
                    Quantity = 2,
                    TaxGroupId = taxGroupId
                },
                new TaxableLineItem
                {
                    Sku = "ITEM-2",
                    Name = "Item 2",
                    Amount = 25m,
                    Quantity = 1,
                    TaxGroupId = taxGroupId
                }
            ]
        };

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(taxGroupId, "US", "NY", It.IsAny<CancellationToken>()))
            .ReturnsAsync(8m); // 8% tax rate

        // Act
        var result = await _provider.CalculateTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        // Item 1: 50 * 2 * 8% = 8
        // Item 2: 25 * 1 * 8% = 2
        // Total: 10
        result.TotalTax.ShouldBe(10m);
        result.LineResults.Count.ShouldBe(2);
    }

    [Fact]
    public async Task CalculateTaxAsync_DifferentTaxGroups_AppliesDifferentRates()
    {
        // Arrange
        var standardTaxGroupId = Guid.NewGuid();
        var reducedTaxGroupId = Guid.NewGuid();

        var request = new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress("GB", null),
            CurrencyCode = "GBP",
            LineItems =
            [
                new TaxableLineItem
                {
                    Sku = "STANDARD-1",
                    Name = "Standard Item",
                    Amount = 100m,
                    Quantity = 1,
                    TaxGroupId = standardTaxGroupId
                },
                new TaxableLineItem
                {
                    Sku = "REDUCED-1",
                    Name = "Reduced Rate Item",
                    Amount = 100m,
                    Quantity = 1,
                    TaxGroupId = reducedTaxGroupId
                }
            ]
        };

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(standardTaxGroupId, "GB", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(20m); // 20% standard VAT

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(reducedTaxGroupId, "GB", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(5m); // 5% reduced VAT

        // Act
        var result = await _provider.CalculateTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        // Standard: 100 * 20% = 20
        // Reduced: 100 * 5% = 5
        // Total: 25
        result.TotalTax.ShouldBe(25m);

        var standardResult = result.LineResults.First(r => r.Sku == "STANDARD-1");
        standardResult.TaxRate.ShouldBe(20m);
        standardResult.TaxAmount.ShouldBe(20m);

        var reducedResult = result.LineResults.First(r => r.Sku == "REDUCED-1");
        reducedResult.TaxRate.ShouldBe(5m);
        reducedResult.TaxAmount.ShouldBe(5m);
    }

    [Fact]
    public async Task CalculateTaxAsync_EmptyLineItems_ReturnsSuccess()
    {
        // Arrange
        var request = new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress("US", "CA"),
            CurrencyCode = "USD",
            LineItems = []
        };

        // Act
        var result = await _provider.CalculateTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalTax.ShouldBe(0m);
        result.LineResults.ShouldBeEmpty();
    }

    [Fact]
    public async Task ValidateConfigurationAsync_AlwaysSucceeds()
    {
        // The manual provider requires no configuration, so validation always succeeds
        var result = await _provider.ValidateConfigurationAsync();

        result.IsValid.ShouldBeTrue();
        result.ErrorMessage.ShouldBeNullOrEmpty();
    }

    private static Address CreateAddress(string countryCode, string? regionCode)
    {
        var address = new Address { CountryCode = countryCode };
        if (regionCode != null)
        {
            address.CountyState.RegionCode = regionCode;
        }
        return address;
    }
}
