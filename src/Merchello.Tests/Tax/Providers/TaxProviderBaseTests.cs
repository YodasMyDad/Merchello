using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Tax.Providers;

/// <summary>
/// Tests for TaxProviderBase helper methods.
/// </summary>
public class TaxProviderBaseTests
{
    private readonly TestTaxProvider _provider;

    public TaxProviderBaseTests()
    {
        _provider = new TestTaxProvider();
    }

    #region GetTaxCodeForTaxGroup Tests

    [Fact]
    public async Task GetTaxCodeForTaxGroup_WithValidMapping_ReturnsCode()
    {
        // Arrange
        var taxGroupId = Guid.NewGuid();
        var config = new TaxProviderConfiguration(new Dictionary<string, string>
        {
            ["taxGroupMappings"] = $"{{\"{taxGroupId}\":\"PB100000\"}}"
        });
        await _provider.ConfigureAsync(config);

        // Act
        var result = _provider.TestGetTaxCodeForTaxGroup(taxGroupId);

        // Assert
        result.ShouldBe("PB100000");
    }

    [Fact]
    public async Task GetTaxCodeForTaxGroup_WithNoMapping_ReturnsNull()
    {
        // Arrange
        var mappedGroupId = Guid.NewGuid();
        var unmappedGroupId = Guid.NewGuid();
        var config = new TaxProviderConfiguration(new Dictionary<string, string>
        {
            ["taxGroupMappings"] = $"{{\"{mappedGroupId}\":\"PB100000\"}}"
        });
        await _provider.ConfigureAsync(config);

        // Act
        var result = _provider.TestGetTaxCodeForTaxGroup(unmappedGroupId);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public void GetTaxCodeForTaxGroup_WithNullTaxGroupId_ReturnsNull()
    {
        // Act
        var result = _provider.TestGetTaxCodeForTaxGroup(null);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public void GetTaxCodeForTaxGroup_WithEmptyConfig_ReturnsNull()
    {
        // Arrange - no configuration set

        // Act
        var result = _provider.TestGetTaxCodeForTaxGroup(Guid.NewGuid());

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetTaxCodeForTaxGroup_WithMalformedJson_ReturnsNull()
    {
        // Arrange
        var config = new TaxProviderConfiguration(new Dictionary<string, string>
        {
            ["taxGroupMappings"] = "{ invalid json }"
        });
        await _provider.ConfigureAsync(config);

        // Act
        var result = _provider.TestGetTaxCodeForTaxGroup(Guid.NewGuid());

        // Assert
        result.ShouldBeNull();
    }

    #endregion

    #region GetShippingTaxCode Tests

    [Fact]
    public async Task GetShippingTaxCode_WithConfig_ReturnsCode()
    {
        // Arrange
        var config = new TaxProviderConfiguration(new Dictionary<string, string>
        {
            ["shippingTaxCode"] = "FR020100"
        });
        await _provider.ConfigureAsync(config);

        // Act
        var result = _provider.TestGetShippingTaxCode();

        // Assert
        result.ShouldBe("FR020100");
    }

    [Fact]
    public void GetShippingTaxCode_WithNoConfig_ReturnsNull()
    {
        // Act
        var result = _provider.TestGetShippingTaxCode();

        // Assert
        result.ShouldBeNull();
    }

    #endregion

    /// <summary>
    /// Test subclass that exposes protected methods for testing.
    /// </summary>
    private class TestTaxProvider : TaxProviderBase
    {
        public override TaxProviderMetadata Metadata => new(
            Alias: "test",
            DisplayName: "Test Provider",
            Icon: null,
            Description: "Test tax provider for unit testing",
            SupportsRealTimeCalculation: false,
            RequiresApiCredentials: false);

        public override Task<TaxCalculationResult> CalculateOrderTaxAsync(
            TaxCalculationRequest request,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(TaxCalculationResult.ZeroTax(request.LineItems));
        }

        // Expose protected methods for testing
        public string? TestGetTaxCodeForTaxGroup(Guid? taxGroupId)
            => GetTaxCodeForTaxGroup(taxGroupId);

        public string? TestGetShippingTaxCode()
            => GetShippingTaxCode();
    }
}
