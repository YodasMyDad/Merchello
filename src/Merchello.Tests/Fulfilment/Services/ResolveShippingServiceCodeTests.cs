using System.Text.Json;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Services;
using Merchello.Core.Shipping.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Services;

/// <summary>
/// Unit tests for FulfilmentService.ResolveShippingServiceCode.
/// Tests the fallback chain: ServiceMappings → Category → DefaultShippingMethod → raw carrier code.
/// </summary>
public class ResolveShippingServiceCodeTests
{
    #region Step 1: ServiceMappings (flat-rate)

    [Fact]
    public void FlatRate_WithServiceMappings_ReturnsMappedCode()
    {
        var optionId = Guid.NewGuid();
        var order = CreateOrder(shippingOptionId: optionId);
        var settings = BuildSettings(serviceMappings: new Dictionary<string, string>
        {
            [optionId.ToString()] = "Ground"
        });

        var result = FulfilmentService.ResolveShippingServiceCode(order, settings);
        result.ShouldBe("Ground");
    }

    [Fact]
    public void FlatRate_WithServiceMappingsAndCategory_ServiceMappingsWins()
    {
        var optionId = Guid.NewGuid();
        var order = CreateOrder(
            shippingOptionId: optionId,
            category: ShippingServiceCategory.Express);
        var settings = BuildSettings(
            serviceMappings: new Dictionary<string, string>
            {
                [optionId.ToString()] = "Priority"
            },
            categoryMappings: new Dictionary<string, string>
            {
                ["ServiceCategoryMapping_Express"] = "2-Day"
            });

        var result = FulfilmentService.ResolveShippingServiceCode(order, settings);
        result.ShouldBe("Priority"); // Step 1 wins over step 2
    }

    [Fact]
    public void FlatRate_ServiceMappingsUnmatched_FallsThrough()
    {
        var optionId = Guid.NewGuid();
        var differentId = Guid.NewGuid();
        var order = CreateOrder(
            shippingOptionId: optionId,
            category: ShippingServiceCategory.Standard);
        var settings = BuildSettings(
            serviceMappings: new Dictionary<string, string>
            {
                [differentId.ToString()] = "Ground"
            },
            categoryMappings: new Dictionary<string, string>
            {
                ["ServiceCategoryMapping_Standard"] = "Economy"
            });

        var result = FulfilmentService.ResolveShippingServiceCode(order, settings);
        result.ShouldBe("Economy"); // Falls through to step 2
    }

    [Fact]
    public void FlatRate_EmptyServiceMappingsJson_FallsThrough()
    {
        var optionId = Guid.NewGuid();
        var order = CreateOrder(
            shippingOptionId: optionId,
            category: ShippingServiceCategory.Standard);
        var settings = BuildSettings(
            serviceMappingsRaw: "",
            categoryMappings: new Dictionary<string, string>
            {
                ["ServiceCategoryMapping_Standard"] = "Ground"
            });

        var result = FulfilmentService.ResolveShippingServiceCode(order, settings);
        result.ShouldBe("Ground"); // Falls through to step 2
    }

    #endregion

    #region Step 2: Category Mapping

    [Fact]
    public void FlatRate_WithCategory_ReturnsCategoryMapping()
    {
        var order = CreateOrder(
            shippingOptionId: Guid.NewGuid(),
            category: ShippingServiceCategory.Overnight);
        var settings = BuildSettings(categoryMappings: new Dictionary<string, string>
        {
            ["ServiceCategoryMapping_Overnight"] = "NextDay"
        });

        var result = FulfilmentService.ResolveShippingServiceCode(order, settings);
        result.ShouldBe("NextDay");
    }

    [Fact]
    public void Dynamic_WithCategory_ReturnsCategoryMapping()
    {
        var order = CreateOrder(
            shippingOptionId: Guid.Empty,
            category: ShippingServiceCategory.Express,
            carrierCode: "FEDEX_2_DAY");
        var settings = BuildSettings(categoryMappings: new Dictionary<string, string>
        {
            ["ServiceCategoryMapping_Express"] = "2-Day"
        });

        var result = FulfilmentService.ResolveShippingServiceCode(order, settings);
        result.ShouldBe("2-Day");
    }

    [Theory]
    [InlineData(ShippingServiceCategory.Standard, "Ground")]
    [InlineData(ShippingServiceCategory.Express, "2-Day")]
    [InlineData(ShippingServiceCategory.Overnight, "Overnight")]
    [InlineData(ShippingServiceCategory.Economy, "Standard")]
    public void Dynamic_AllCategories_ReturnCorrectMapping(ShippingServiceCategory category, string expected)
    {
        var order = CreateOrder(shippingOptionId: Guid.Empty, category: category);
        var settings = BuildSettings(categoryMappings: new Dictionary<string, string>
        {
            ["ServiceCategoryMapping_Standard"] = "Ground",
            ["ServiceCategoryMapping_Express"] = "2-Day",
            ["ServiceCategoryMapping_Overnight"] = "Overnight",
            ["ServiceCategoryMapping_Economy"] = "Standard"
        });

        var result = FulfilmentService.ResolveShippingServiceCode(order, settings);
        result.ShouldBe(expected);
    }

    #endregion

    #region Step 3: DefaultShippingMethod

    [Fact]
    public void FlatRate_NoMappings_NoCategory_ReturnsDefaultShippingMethod()
    {
        var order = CreateOrder(shippingOptionId: Guid.NewGuid(), category: null);
        var settings = BuildSettings(defaultShippingMethod: "Standard");

        var result = FulfilmentService.ResolveShippingServiceCode(order, settings);
        result.ShouldBe("Standard");
    }

    [Fact]
    public void Dynamic_NoCategory_ReturnsDefaultShippingMethod()
    {
        var order = CreateOrder(
            shippingOptionId: Guid.Empty,
            category: null,
            carrierCode: "FEDEX_GROUND");
        var settings = BuildSettings(defaultShippingMethod: "Ground");

        var result = FulfilmentService.ResolveShippingServiceCode(order, settings);
        result.ShouldBe("Ground");
    }

    #endregion

    #region Step 4: Raw carrier code

    [Fact]
    public void Dynamic_NoCategory_NoDefault_ReturnsRawCarrierCode()
    {
        var order = CreateOrder(
            shippingOptionId: Guid.Empty,
            category: null,
            carrierCode: "FEDEX_GROUND");
        var settings = BuildSettings(); // No mappings, no default

        var result = FulfilmentService.ResolveShippingServiceCode(order, settings);
        result.ShouldBe("FEDEX_GROUND");
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void NullSettingsJson_ReturnsRawCarrierCode()
    {
        var order = CreateOrder(
            shippingOptionId: Guid.Empty,
            category: ShippingServiceCategory.Standard,
            carrierCode: "UPS_GROUND");

        var result = FulfilmentService.ResolveShippingServiceCode(order, null);
        result.ShouldBe("UPS_GROUND");
    }

    [Fact]
    public void EmptySettingsJson_ReturnsRawCarrierCode()
    {
        var order = CreateOrder(
            shippingOptionId: Guid.Empty,
            category: ShippingServiceCategory.Standard,
            carrierCode: "UPS_GROUND");

        var result = FulfilmentService.ResolveShippingServiceCode(order, "");
        result.ShouldBe("UPS_GROUND");
    }

    [Fact]
    public void MalformedSettingsJson_ReturnsRawCarrierCode()
    {
        var order = CreateOrder(
            shippingOptionId: Guid.Empty,
            category: ShippingServiceCategory.Standard,
            carrierCode: "FEDEX_GROUND");

        var result = FulfilmentService.ResolveShippingServiceCode(order, "not valid json {{{");
        result.ShouldBe("FEDEX_GROUND");
    }

    [Fact]
    public void NullCarrierCode_NullSettings_ReturnsNull()
    {
        var order = CreateOrder(
            shippingOptionId: Guid.Empty,
            category: null,
            carrierCode: null);

        var result = FulfilmentService.ResolveShippingServiceCode(order, null);
        result.ShouldBeNull();
    }

    [Fact]
    public void NothingConfigured_FlatRate_ReturnsNull()
    {
        var order = CreateOrder(
            shippingOptionId: Guid.NewGuid(),
            category: null,
            carrierCode: null);
        var settings = BuildSettings(); // Empty settings

        var result = FulfilmentService.ResolveShippingServiceCode(order, settings);
        result.ShouldBeNull();
    }

    #endregion

    #region Helpers

    private static Order CreateOrder(
        Guid shippingOptionId = default,
        ShippingServiceCategory? category = null,
        string? carrierCode = null)
    {
        return new Order
        {
            ShippingOptionId = shippingOptionId,
            ShippingServiceCategory = category,
            ShippingServiceCode = carrierCode
        };
    }

    private static string BuildSettings(
        Dictionary<string, string>? serviceMappings = null,
        string? serviceMappingsRaw = null,
        Dictionary<string, string>? categoryMappings = null,
        string? defaultShippingMethod = null)
    {
        var settings = new Dictionary<string, object>();

        if (serviceMappings != null)
        {
            // ServiceMappings is double-serialized (JSON string value)
            settings["ServiceMappings"] = JsonSerializer.Serialize(serviceMappings);
        }
        else if (serviceMappingsRaw != null)
        {
            settings["ServiceMappings"] = serviceMappingsRaw;
        }

        if (categoryMappings != null)
        {
            foreach (var kvp in categoryMappings)
            {
                settings[kvp.Key] = kvp.Value;
            }
        }

        if (defaultShippingMethod != null)
        {
            settings["DefaultShippingMethod"] = defaultShippingMethod;
        }

        return JsonSerializer.Serialize(settings);
    }

    #endregion
}
