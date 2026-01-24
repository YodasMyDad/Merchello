using Merchello.Core.Locality.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Tax.Providers.BuiltIn;
using Merchello.Core.Tax.Providers.Models;
using Merchello.Core.Shared.Providers;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Tax.Providers;

/// <summary>
/// Tests for the AvalaraTaxProvider.
/// Note: These tests verify the provider's behavior without making actual API calls.
/// Integration tests with real API credentials should be run separately.
/// </summary>
public class AvalaraTaxProviderTests
{
    private readonly AvalaraTaxProvider _provider;

    public AvalaraTaxProviderTests()
    {
        _provider = new AvalaraTaxProvider();
    }

    [Fact]
    public void Metadata_HasCorrectAlias()
    {
        _provider.Metadata.Alias.ShouldBe("avalara");
    }

    [Fact]
    public void Metadata_HasCorrectDisplayName()
    {
        _provider.Metadata.DisplayName.ShouldBe("Avalara AvaTax");
    }

    [Fact]
    public void Metadata_RequiresApiCredentials()
    {
        _provider.Metadata.RequiresApiCredentials.ShouldBeTrue();
    }

    [Fact]
    public void Metadata_SupportsRealTimeCalculation()
    {
        _provider.Metadata.SupportsRealTimeCalculation.ShouldBeTrue();
    }

    [Fact]
    public void Metadata_HasIcon()
    {
        _provider.Metadata.Icon.ShouldBe("icon-cloud");
    }

    [Fact]
    public void Metadata_HasDescription()
    {
        _provider.Metadata.Description.ShouldNotBeNullOrWhiteSpace();
        _provider.Metadata.Description.ShouldContain("Avalara");
    }

    [Fact]
    public void Metadata_HasSetupInstructions()
    {
        _provider.Metadata.SetupInstructions.ShouldNotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GetConfigurationFieldsAsync_ReturnsRequiredFields()
    {
        var fields = (await _provider.GetConfigurationFieldsAsync()).ToList();

        fields.ShouldNotBeEmpty();
        fields.Count.ShouldBeGreaterThanOrEqualTo(4);
    }

    [Fact]
    public async Task GetConfigurationFieldsAsync_ContainsAccountIdField()
    {
        var fields = (await _provider.GetConfigurationFieldsAsync()).ToList();

        var accountIdField = fields.FirstOrDefault(f => f.Key == "accountId");
        accountIdField.ShouldNotBeNull();
        accountIdField.Label.ShouldBe("Account ID");
        accountIdField.FieldType.ShouldBe(ConfigurationFieldType.Text);
        accountIdField.IsRequired.ShouldBeTrue();
        accountIdField.IsSensitive.ShouldBeFalse();
    }

    [Fact]
    public async Task GetConfigurationFieldsAsync_ContainsLicenseKeyField()
    {
        var fields = (await _provider.GetConfigurationFieldsAsync()).ToList();

        var licenseKeyField = fields.FirstOrDefault(f => f.Key == "licenseKey");
        licenseKeyField.ShouldNotBeNull();
        licenseKeyField.Label.ShouldBe("License Key");
        licenseKeyField.FieldType.ShouldBe(ConfigurationFieldType.Password);
        licenseKeyField.IsRequired.ShouldBeTrue();
        licenseKeyField.IsSensitive.ShouldBeTrue();
    }

    [Fact]
    public async Task GetConfigurationFieldsAsync_ContainsCompanyCodeField()
    {
        var fields = (await _provider.GetConfigurationFieldsAsync()).ToList();

        var companyCodeField = fields.FirstOrDefault(f => f.Key == "companyCode");
        companyCodeField.ShouldNotBeNull();
        companyCodeField.Label.ShouldBe("Company Code");
        companyCodeField.FieldType.ShouldBe(ConfigurationFieldType.Text);
        companyCodeField.IsRequired.ShouldBeTrue();
        companyCodeField.DefaultValue.ShouldBe("DEFAULT");
    }

    [Fact]
    public async Task GetConfigurationFieldsAsync_ContainsEnvironmentField()
    {
        var fields = (await _provider.GetConfigurationFieldsAsync()).ToList();

        var environmentField = fields.FirstOrDefault(f => f.Key == "environment");
        environmentField.ShouldNotBeNull();
        environmentField.Label.ShouldBe("Environment");
        environmentField.FieldType.ShouldBe(ConfigurationFieldType.Select);
        environmentField.IsRequired.ShouldBeTrue();
        environmentField.DefaultValue.ShouldBe("sandbox");
        environmentField.Options.ShouldNotBeNull();
        environmentField.Options.Count().ShouldBe(2);
    }

    [Fact]
    public async Task GetConfigurationFieldsAsync_ContainsLoggingField()
    {
        var fields = (await _provider.GetConfigurationFieldsAsync()).ToList();

        var loggingField = fields.FirstOrDefault(f => f.Key == "enableLogging");
        loggingField.ShouldNotBeNull();
        loggingField.FieldType.ShouldBe(ConfigurationFieldType.Checkbox);
        loggingField.IsRequired.ShouldBeFalse();
        loggingField.DefaultValue.ShouldBe("false");
    }

    [Fact]
    public async Task GetConfigurationFieldsAsync_ContainsTaxGroupMappingField()
    {
        var fields = (await _provider.GetConfigurationFieldsAsync()).ToList();

        var mappingField = fields.FirstOrDefault(f => f.Key == "taxGroupMappings");
        mappingField.ShouldNotBeNull();
        mappingField.Label.ShouldBe("Tax Group Mappings");
        mappingField.FieldType.ShouldBe(ConfigurationFieldType.TaxGroupMapping);
        mappingField.IsRequired.ShouldBeFalse();
    }

    [Fact]
    public async Task GetConfigurationFieldsAsync_ContainsShippingTaxCodeField()
    {
        var fields = (await _provider.GetConfigurationFieldsAsync()).ToList();

        var shippingField = fields.FirstOrDefault(f => f.Key == "shippingTaxCode");
        shippingField.ShouldNotBeNull();
        shippingField.Label.ShouldBe("Shipping Tax Code");
        shippingField.FieldType.ShouldBe(ConfigurationFieldType.Text);
        shippingField.DefaultValue.ShouldBe("FR020100");
    }

    [Fact]
    public async Task CalculateOrderTaxAsync_WhenNotConfigured_ReturnsFailed()
    {
        // Arrange - provider is not configured
        var request = CreateTaxRequest("US", "CA");

        // Act
        var result = await _provider.CalculateOrderTaxAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrWhiteSpace();
        result.ErrorMessage.ShouldContain("not configured");
    }

    [Fact]
    public async Task CalculateOrderTaxAsync_WhenTaxExempt_ReturnsZeroTax()
    {
        // Arrange
        var request = new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress("US", "CA"),
            CurrencyCode = "USD",
            IsTaxExempt = true,
            LineItems =
            [
                new TaxableLineItem
                {
                    Sku = "TEST-001",
                    Name = "Test Product",
                    Amount = 100m,
                    Quantity = 1
                }
            ]
        };

        // Act
        var result = await _provider.CalculateOrderTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalTax.ShouldBe(0m);
        result.LineResults.ShouldHaveSingleItem();
        result.LineResults[0].TaxAmount.ShouldBe(0m);
        result.LineResults[0].IsTaxable.ShouldBeFalse();
    }

    [Fact]
    public async Task CalculateOrderTaxAsync_WithoutCountryCode_WhenNotConfigured_ReturnsNotConfiguredError()
    {
        // Arrange - address without country code, provider not configured
        // Note: Without configuration, the "not configured" error will be returned first.
        // Country code validation would be tested in integration tests with real credentials.
        var request = new TaxCalculationRequest
        {
            ShippingAddress = new Address { TownCity = "Los Angeles" },
            CurrencyCode = "USD",
            LineItems =
            [
                new TaxableLineItem
                {
                    Sku = "TEST-001",
                    Name = "Test Product",
                    Amount = 100m,
                    Quantity = 1
                }
            ]
        };

        // Act
        var result = await _provider.CalculateOrderTaxAsync(request);

        // Assert - Provider returns "not configured" error first
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNull();
        result.ErrorMessage.ShouldContain("not configured");
    }

    [Fact]
    public async Task ValidateConfigurationAsync_WhenNotConfigured_ReturnsInvalid()
    {
        // Arrange - provider is not configured

        // Act
        var result = await _provider.ValidateConfigurationAsync();

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task ConfigureAsync_WithNullConfiguration_ClearsClient()
    {
        // Arrange & Act
        await _provider.ConfigureAsync(null);

        // Try to calculate tax - should fail because client is null
        var request = CreateTaxRequest("US", "CA");
        var result = await _provider.CalculateOrderTaxAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNull();
        result.ErrorMessage.ShouldContain("not configured");
    }

    [Fact]
    public async Task CalculateOrderTaxAsync_EmptyLineItems_ReturnsSuccess()
    {
        // Arrange - tax exempt with empty line items
        var request = new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress("US", "CA"),
            CurrencyCode = "USD",
            IsTaxExempt = true,
            LineItems = []
        };

        // Act
        var result = await _provider.CalculateOrderTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalTax.ShouldBe(0m);
        result.LineResults.ShouldBeEmpty();
    }

    private static TaxCalculationRequest CreateTaxRequest(string countryCode, string? regionCode)
    {
        return new TaxCalculationRequest
        {
            ShippingAddress = CreateAddress(countryCode, regionCode),
            CurrencyCode = "USD",
            LineItems =
            [
                new TaxableLineItem
                {
                    Sku = "TEST-001",
                    Name = "Test Product",
                    Amount = 100m,
                    Quantity = 1
                }
            ]
        };
    }

    private static Address CreateAddress(string countryCode, string? regionCode)
    {
        var address = new Address
        {
            AddressOne = "123 Main Street",
            TownCity = "Los Angeles",
            PostalCode = "90001",
            CountryCode = countryCode
        };

        if (regionCode != null)
        {
            address.CountyState.RegionCode = regionCode;
        }

        return address;
    }
}
