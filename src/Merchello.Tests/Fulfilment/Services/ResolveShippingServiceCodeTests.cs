using System.Text.Json;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Services;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.Extensions.Options;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Services;

/// <summary>
/// Unit tests for FulfilmentService.ResolveShippingServiceCode.
/// Tests the fallback chain: Category -> DefaultShippingMethod -> raw carrier code.
/// </summary>
public class ResolveShippingServiceCodeTests
{
    private static readonly ICurrencyService CurrencyService = new CurrencyService(
        Options.Create(new MerchelloSettings { DefaultRounding = MidpointRounding.AwayFromZero, StoreCurrencyCode = "USD" }));
    private static readonly InvoiceFactory InvoiceFactory = new(CurrencyService);
    private static readonly OrderFactory OrderFactory = new();
    private static readonly AddressFactory AddressFactory = new();

    #region Step 1: Category Mapping

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

    [Fact]
    public void ServiceMappingsPresent_AreIgnored_UsesCategoryMapping()
    {
        var optionId = Guid.NewGuid();
        var order = CreateOrder(
            shippingOptionId: optionId,
            category: ShippingServiceCategory.Express);
        var serviceMappings = JsonSerializer.Serialize(new Dictionary<string, string>
        {
            [optionId.ToString()] = "LegacyCode"
        });
        var settings = BuildSettings(
            categoryMappings: new Dictionary<string, string>
            {
                ["ServiceCategoryMapping_Express"] = "2-Day"
            },
            additionalSettings: new Dictionary<string, object>
            {
                ["ServiceMappings"] = serviceMappings
            });

        var result = FulfilmentService.ResolveShippingServiceCode(order, settings);
        result.ShouldBe("2-Day");
    }

    #endregion

    #region Step 2: DefaultShippingMethod

    [Fact]
    public void FlatRate_NoCategory_ReturnsDefaultShippingMethod()
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

    #region Step 3: Raw carrier code

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
        var billingAddress = AddressFactory.CreateFromFormData(
            firstName: "Test",
            lastName: "Customer",
            address1: "123 Main St",
            address2: null,
            city: "Test City",
            postalCode: "10001",
            countryCode: "US",
            regionCode: null,
            phone: null,
            email: "test@example.com");

        var shippingAddress = AddressFactory.CreateFromFormData(
            firstName: "Test",
            lastName: "Customer",
            address1: "123 Main St",
            address2: null,
            city: "Test City",
            postalCode: "10001",
            countryCode: "US",
            regionCode: null,
            phone: null,
            email: "test@example.com");

        var invoice = InvoiceFactory.CreateManual(
            invoiceNumber: $"INV-{Guid.NewGuid():N}"[..6],
            customerId: Guid.NewGuid(),
            billingAddress: billingAddress,
            shippingAddress: shippingAddress,
            currencyCode: "USD",
            subTotal: 0m,
            tax: 0m,
            total: 0m);

        var order = OrderFactory.Create(invoice, Guid.NewGuid(), shippingOptionId);
        order.ShippingOptionId = shippingOptionId;
        order.ShippingServiceCategory = category;
        order.ShippingServiceCode = carrierCode;
        return order;
    }

    private static string BuildSettings(
        Dictionary<string, string>? categoryMappings = null,
        string? defaultShippingMethod = null,
        Dictionary<string, object>? additionalSettings = null)
    {
        var settings = new Dictionary<string, object>();

        if (additionalSettings != null)
        {
            foreach (var setting in additionalSettings)
            {
                settings[setting.Key] = setting.Value;
            }
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
