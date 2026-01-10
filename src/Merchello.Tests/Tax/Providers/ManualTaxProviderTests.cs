using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Providers;
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
    private readonly Mock<ICurrencyService> _currencyServiceMock = new();
    private readonly ManualTaxProvider _provider;

    public ManualTaxProviderTests()
    {
        // Setup currency service to round to 2 decimal places by default
        _currencyServiceMock
            .Setup(x => x.Round(It.IsAny<decimal>(), It.IsAny<string>()))
            .Returns((decimal value, string _) => Math.Round(value, 2, MidpointRounding.AwayFromZero));

        // Default: no shipping tax override
        _taxServiceMock
            .Setup(x => x.GetShippingTaxOverrideAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ShippingTaxOverride?)null);

        _provider = new ManualTaxProvider(_taxServiceMock.Object, _currencyServiceMock.Object);
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
    public async Task GetConfigurationFieldsAsync_ReturnsShippingTaxFields()
    {
        // The manual provider has shipping tax configuration fields
        var fields = (await _provider.GetConfigurationFieldsAsync()).ToList();

        fields.Count.ShouldBe(2);

        // First field: isShippingTaxable checkbox
        var taxableField = fields.First(f => f.Key == "isShippingTaxable");
        taxableField.Label.ShouldBe("Tax Shipping");
        taxableField.FieldType.ShouldBe(ConfigurationFieldType.Checkbox);
        taxableField.DefaultValue.ShouldBe("false");

        // Second field: shippingTaxGroupId text
        var groupField = fields.First(f => f.Key == "shippingTaxGroupId");
        groupField.Label.ShouldBe("Shipping Tax Group");
        groupField.FieldType.ShouldBe(ConfigurationFieldType.Text);
        groupField.IsRequired.ShouldBeFalse();
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

    #region Shipping Tax Tests

    [Fact]
    public async Task CalculateTaxAsync_WithShipping_NoOverride_NoConfig_ReturnsZeroShippingTax()
    {
        // Arrange - No override, default config (shipping not taxable)
        var taxGroupId = Guid.NewGuid();
        var request = new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress("US", "CA"),
            CurrencyCode = "USD",
            ShippingAmount = 10m,
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
            .ReturnsAsync(8.25m);

        // Act
        var result = await _provider.CalculateTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.ShippingTax.ShouldBe(0m); // No shipping tax by default
        result.TotalTax.ShouldBe(8.25m); // Only line item tax
    }

    [Fact]
    public async Task CalculateTaxAsync_WithShipping_RegionalOverride_TaxGroup_AppliesOverrideRate()
    {
        // Arrange - Regional override with specific tax group for shipping
        var itemTaxGroupId = Guid.NewGuid();
        var shippingTaxGroupId = Guid.NewGuid();

        _taxServiceMock
            .Setup(x => x.GetShippingTaxOverrideAsync("US", "CA", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ShippingTaxOverride
            {
                CountryCode = "US",
                StateOrProvinceCode = "CA",
                ShippingTaxGroupId = shippingTaxGroupId
            });

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(itemTaxGroupId, "US", "CA", It.IsAny<CancellationToken>()))
            .ReturnsAsync(8.25m);

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(shippingTaxGroupId, "US", "CA", It.IsAny<CancellationToken>()))
            .ReturnsAsync(5m); // Different rate for shipping

        var request = new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress("US", "CA"),
            CurrencyCode = "USD",
            ShippingAmount = 20m,
            LineItems =
            [
                new TaxableLineItem
                {
                    Sku = "TEST-001",
                    Name = "Test Product",
                    Amount = 100m,
                    Quantity = 1,
                    TaxGroupId = itemTaxGroupId
                }
            ]
        };

        // Act
        var result = await _provider.CalculateTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.ShippingTax.ShouldBe(1m); // 20 * 5% = 1
        result.TotalTax.ShouldBe(9.25m); // 8.25 (item) + 1 (shipping)
    }

    [Fact]
    public async Task CalculateTaxAsync_WithShipping_RegionalOverride_NullTaxGroup_NoShippingTax()
    {
        // Arrange - Regional override with null tax group (shipping never taxed in this region)
        // Line items are still taxed; only shipping is exempt due to regional override
        var itemTaxGroupId = Guid.NewGuid();

        _taxServiceMock
            .Setup(x => x.GetShippingTaxOverrideAsync("US", "AL", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ShippingTaxOverride
            {
                CountryCode = "US",
                StateOrProvinceCode = "AL",
                ShippingTaxGroupId = null // Explicitly no shipping tax in Alabama
            });

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(itemTaxGroupId, "US", "AL", It.IsAny<CancellationToken>()))
            .ReturnsAsync(4m); // Alabama has 4% state sales tax

        var request = new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress("US", "AL"),
            CurrencyCode = "USD",
            ShippingAmount = 15m,
            LineItems =
            [
                new TaxableLineItem
                {
                    Sku = "TEST-001",
                    Name = "Test Product",
                    Amount = 100m,
                    Quantity = 1,
                    TaxGroupId = itemTaxGroupId
                }
            ]
        };

        // Act
        var result = await _provider.CalculateTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.ShippingTax.ShouldBe(0m); // Override says no shipping tax (even though items are taxed)
        result.TotalTax.ShouldBe(4m); // 100 * 4% = 4 (item only, no shipping tax)
    }

    [Fact]
    public async Task CalculateTaxAsync_WithShipping_ConfiguredTaxGroup_AppliesConfiguredRate()
    {
        // Arrange - No regional override, but provider configured with shipping tax group
        var itemTaxGroupId = Guid.NewGuid();
        var shippingTaxGroupId = Guid.NewGuid();

        // Configure provider with shipping tax settings
        await _provider.ConfigureAsync(new TaxProviderConfiguration(new Dictionary<string, string>
        {
            { "isShippingTaxable", "true" },
            { "shippingTaxGroupId", shippingTaxGroupId.ToString() }
        }));

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(itemTaxGroupId, "GB", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(20m); // UK VAT

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(shippingTaxGroupId, "GB", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(20m); // UK VAT on shipping

        var request = new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress("GB", null),
            CurrencyCode = "GBP",
            ShippingAmount = 10m,
            LineItems =
            [
                new TaxableLineItem
                {
                    Sku = "TEST-001",
                    Name = "Test Product",
                    Amount = 100m,
                    Quantity = 1,
                    TaxGroupId = itemTaxGroupId
                }
            ]
        };

        // Act
        var result = await _provider.CalculateTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.ShippingTax.ShouldBe(2m); // 10 * 20% = 2
        result.TotalTax.ShouldBe(22m); // 20 (item) + 2 (shipping)
    }

    [Fact]
    public async Task CalculateTaxAsync_WithShipping_ProportionalRate_MixedTaxRates()
    {
        // Arrange - No regional override, no configured tax group, but shipping is taxable
        // Uses proportional (weighted average) calculation - EU/UK compliant
        var standardTaxGroupId = Guid.NewGuid();
        var reducedTaxGroupId = Guid.NewGuid();

        await _provider.ConfigureAsync(new TaxProviderConfiguration(new Dictionary<string, string>
        {
            { "isShippingTaxable", "true" }
            // No shippingTaxGroupId - uses proportional calculation
        }));

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(standardTaxGroupId, "GB", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(20m); // Standard VAT

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(reducedTaxGroupId, "GB", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(5m); // Reduced VAT

        var request = new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress("GB", null),
            CurrencyCode = "GBP",
            ShippingAmount = 10m,
            LineItems =
            [
                new TaxableLineItem
                {
                    Sku = "STANDARD-001",
                    Name = "Standard Item",
                    Amount = 100m, // £100 at 20% = £20 tax
                    Quantity = 1,
                    TaxGroupId = standardTaxGroupId
                },
                new TaxableLineItem
                {
                    Sku = "REDUCED-001",
                    Name = "Reduced Rate Item",
                    Amount = 100m, // £100 at 5% = £5 tax
                    Quantity = 1,
                    TaxGroupId = reducedTaxGroupId
                }
            ]
        };

        // Act
        var result = await _provider.CalculateTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();

        // Line item taxes: £20 + £5 = £25
        // Total taxable: £200
        // Effective rate: £25 / £200 = 12.5%
        // Shipping tax: £10 * 12.5% = £1.25
        result.ShippingTax.ShouldBe(1.25m);
        result.TotalTax.ShouldBe(26.25m); // 25 (items) + 1.25 (shipping)
    }

    [Fact]
    public async Task CalculateTaxAsync_WithShipping_ProportionalRate_OnlyNonTaxableItems_NoShippingTax()
    {
        // Arrange - Proportional shipping tax, but no taxable items
        await _provider.ConfigureAsync(new TaxProviderConfiguration(new Dictionary<string, string>
        {
            { "isShippingTaxable", "true" }
        }));

        var request = new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress("GB", null),
            CurrencyCode = "GBP",
            ShippingAmount = 10m,
            LineItems =
            [
                new TaxableLineItem
                {
                    Sku = "NON-TAX-001",
                    Name = "Non-Taxable Item",
                    Amount = 100m,
                    Quantity = 1,
                    TaxGroupId = null, // No tax group = not taxable
                    IsTaxable = false
                }
            ]
        };

        // Act
        var result = await _provider.CalculateTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.ShippingTax.ShouldBe(0m); // No taxable items = no proportional shipping tax
        result.TotalTax.ShouldBe(0m);
    }

    [Fact]
    public async Task CalculateTaxAsync_WithShipping_ZeroShippingAmount_NoShippingTax()
    {
        // Arrange
        var taxGroupId = Guid.NewGuid();

        await _provider.ConfigureAsync(new TaxProviderConfiguration(new Dictionary<string, string>
        {
            { "isShippingTaxable", "true" }
        }));

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(taxGroupId, "US", "CA", It.IsAny<CancellationToken>()))
            .ReturnsAsync(8.25m);

        var request = new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress("US", "CA"),
            CurrencyCode = "USD",
            ShippingAmount = 0m, // Free shipping
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

        // Act
        var result = await _provider.CalculateTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.ShippingTax.ShouldBe(0m);
        result.TotalTax.ShouldBe(8.25m);
    }

    [Fact]
    public async Task CalculateTaxAsync_WithShipping_RegionalOverrideTakesPrecedence_OverConfig()
    {
        // Arrange - Both regional override and config exist, regional takes precedence
        var itemTaxGroupId = Guid.NewGuid();
        var configShippingTaxGroupId = Guid.NewGuid();
        var overrideShippingTaxGroupId = Guid.NewGuid();

        // Configure with one tax group
        await _provider.ConfigureAsync(new TaxProviderConfiguration(new Dictionary<string, string>
        {
            { "isShippingTaxable", "true" },
            { "shippingTaxGroupId", configShippingTaxGroupId.ToString() }
        }));

        // Override with different tax group
        _taxServiceMock
            .Setup(x => x.GetShippingTaxOverrideAsync("US", "CA", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ShippingTaxOverride
            {
                CountryCode = "US",
                StateOrProvinceCode = "CA",
                ShippingTaxGroupId = overrideShippingTaxGroupId
            });

        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(itemTaxGroupId, "US", "CA", It.IsAny<CancellationToken>()))
            .ReturnsAsync(8.25m);

        // This should NOT be called - override takes precedence
        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(configShippingTaxGroupId, "US", "CA", It.IsAny<CancellationToken>()))
            .ReturnsAsync(10m);

        // This SHOULD be called - from the override
        _taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(overrideShippingTaxGroupId, "US", "CA", It.IsAny<CancellationToken>()))
            .ReturnsAsync(5m);

        var request = new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress("US", "CA"),
            CurrencyCode = "USD",
            ShippingAmount = 20m,
            LineItems =
            [
                new TaxableLineItem
                {
                    Sku = "TEST-001",
                    Name = "Test Product",
                    Amount = 100m,
                    Quantity = 1,
                    TaxGroupId = itemTaxGroupId
                }
            ]
        };

        // Act
        var result = await _provider.CalculateTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.ShippingTax.ShouldBe(1m); // 20 * 5% (override rate) = 1, not 20 * 10%
        result.TotalTax.ShouldBe(9.25m);

        // Verify the override rate was called, not the config rate
        _taxServiceMock.Verify(
            x => x.GetApplicableRateAsync(overrideShippingTaxGroupId, "US", "CA", It.IsAny<CancellationToken>()),
            Times.Once);
        _taxServiceMock.Verify(
            x => x.GetApplicableRateAsync(configShippingTaxGroupId, "US", "CA", It.IsAny<CancellationToken>()),
            Times.Never);
    }

    #endregion

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
