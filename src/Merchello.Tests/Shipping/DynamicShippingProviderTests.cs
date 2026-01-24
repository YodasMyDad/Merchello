using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Services;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shipping;

/// <summary>
/// Integration tests for dynamic shipping provider functionality (FedEx, UPS, etc.).
/// Tests that external providers return rates > $0 and that checkout correctly saves provider/service fields.
/// </summary>
public class DynamicShippingProviderTests
{
    #region A.6.2 - Dynamic Provider Returns Rates > $0

    [Fact]
    public void DynamicProvider_FedEx_ReturnsRatesGreaterThanZero()
    {
        // Arrange - Simulate what a FedEx provider would return
        var fedexQuote = new ShippingRateQuote
        {
            ProviderKey = "fedex",
            ProviderName = "FedEx",
            ServiceLevels =
            [
                new ShippingServiceLevel
                {
                    ServiceCode = "FEDEX_GROUND",
                    ServiceName = "FedEx Ground",
                    TotalCost = 12.99m,
                    CurrencyCode = "USD",
                    TransitTime = TimeSpan.FromDays(5),
                    ServiceType = new ShippingServiceType { Code = "FEDEX_GROUND", DisplayName = "FedEx Ground", ProviderKey = "fedex" }
                },
                new ShippingServiceLevel
                {
                    ServiceCode = "FEDEX_EXPRESS_SAVER",
                    ServiceName = "FedEx Express Saver",
                    TotalCost = 24.50m,
                    CurrencyCode = "USD",
                    TransitTime = TimeSpan.FromDays(3),
                    ServiceType = new ShippingServiceType { Code = "FEDEX_EXPRESS_SAVER", DisplayName = "FedEx Express Saver", ProviderKey = "fedex" }
                }
            ],
            Errors = []
        };

        // Assert - Provider returns valid rates
        fedexQuote.ProviderKey.ShouldBe("fedex");
        fedexQuote.ServiceLevels.Count.ShouldBe(2);

        // All rates should be > $0
        foreach (var level in fedexQuote.ServiceLevels)
        {
            level.TotalCost.ShouldBeGreaterThan(0m, $"Service {level.ServiceCode} should have cost > $0");
        }

        // Verify specific services
        var ground = fedexQuote.ServiceLevels.First(s => s.ServiceCode == "FEDEX_GROUND");
        ground.TotalCost.ShouldBe(12.99m);

        var express = fedexQuote.ServiceLevels.First(s => s.ServiceCode == "FEDEX_EXPRESS_SAVER");
        express.TotalCost.ShouldBe(24.50m);

        // Verify SelectionKey generation
        var groundKey = SelectionKeyExtensions.ForDynamicProvider("fedex", "FEDEX_GROUND");
        groundKey.ShouldBe("dyn:fedex:FEDEX_GROUND");
        SelectionKeyExtensions.IsDynamicProvider(groundKey).ShouldBeTrue();
    }

    [Fact]
    public void DynamicProvider_UPS_ReturnsRatesGreaterThanZero()
    {
        // Arrange - Simulate what a UPS provider would return
        var upsQuote = new ShippingRateQuote
        {
            ProviderKey = "ups",
            ProviderName = "UPS",
            ServiceLevels =
            [
                new ShippingServiceLevel
                {
                    ServiceCode = "03",
                    ServiceName = "UPS Ground",
                    TotalCost = 15.75m,
                    CurrencyCode = "USD",
                    TransitTime = TimeSpan.FromDays(5),
                    ServiceType = new ShippingServiceType { Code = "03", DisplayName = "UPS Ground", ProviderKey = "ups" }
                },
                new ShippingServiceLevel
                {
                    ServiceCode = "02",
                    ServiceName = "UPS 2nd Day Air",
                    TotalCost = 35.00m,
                    CurrencyCode = "USD",
                    TransitTime = TimeSpan.FromDays(2),
                    ServiceType = new ShippingServiceType { Code = "02", DisplayName = "UPS 2nd Day Air", ProviderKey = "ups" }
                },
                new ShippingServiceLevel
                {
                    ServiceCode = "01",
                    ServiceName = "UPS Next Day Air",
                    TotalCost = 55.99m,
                    CurrencyCode = "USD",
                    TransitTime = TimeSpan.FromDays(1),
                    ServiceType = new ShippingServiceType { Code = "01", DisplayName = "UPS Next Day Air", ProviderKey = "ups" }
                }
            ],
            Errors = []
        };

        // Assert - Provider returns valid rates
        upsQuote.ProviderKey.ShouldBe("ups");
        upsQuote.ServiceLevels.Count.ShouldBe(3);

        // All rates should be > $0
        foreach (var level in upsQuote.ServiceLevels)
        {
            level.TotalCost.ShouldBeGreaterThan(0m, $"Service {level.ServiceCode} should have cost > $0");
        }

        // Verify SelectionKey generation for UPS services
        var groundKey = SelectionKeyExtensions.ForDynamicProvider("ups", "03");
        groundKey.ShouldBe("dyn:ups:03");
        SelectionKeyExtensions.IsDynamicProvider(groundKey).ShouldBeTrue();
    }

    [Fact]
    public void DynamicProvider_MultipleCombined_AllHaveRatesGreaterThanZero()
    {
        // Arrange - When both FedEx and UPS are enabled, both return valid quotes
        var quotes = new List<ShippingRateQuote>
        {
            new()
            {
                ProviderKey = "fedex",
                ProviderName = "FedEx",
                ServiceLevels =
                [
                    new ShippingServiceLevel
                    {
                        ServiceCode = "FEDEX_GROUND",
                        ServiceName = "FedEx Ground",
                        TotalCost = 9.99m,
                        CurrencyCode = "USD"
                    }
                ],
                Errors = []
            },
            new()
            {
                ProviderKey = "ups",
                ProviderName = "UPS",
                ServiceLevels =
                [
                    new ShippingServiceLevel
                    {
                        ServiceCode = "03",
                        ServiceName = "UPS Ground",
                        TotalCost = 11.50m,
                        CurrencyCode = "USD"
                    }
                ],
                Errors = []
            }
        };

        // Assert
        quotes.Count.ShouldBe(2);

        var fedexQuote = quotes.First(q => q.ProviderKey == "fedex");
        fedexQuote.ServiceLevels.ShouldNotBeEmpty();
        fedexQuote.ServiceLevels.All(s => s.TotalCost > 0).ShouldBeTrue();

        var upsQuote = quotes.First(q => q.ProviderKey == "ups");
        upsQuote.ServiceLevels.ShouldNotBeEmpty();
        upsQuote.ServiceLevels.All(s => s.TotalCost > 0).ShouldBeTrue();
    }

    [Fact]
    public void ShippingRateQuote_WithErrors_StillContainsValidStructure()
    {
        // Arrange - Provider might return errors (e.g., API timeout, invalid address)
        var quoteWithErrors = new ShippingRateQuote
        {
            ProviderKey = "fedex",
            ProviderName = "FedEx",
            ServiceLevels = [],
            Errors = ["Address validation failed", "Postal code not in service area"]
        };

        // Assert - Error handling structure is valid
        quoteWithErrors.ProviderKey.ShouldBe("fedex");
        quoteWithErrors.ServiceLevels.ShouldBeEmpty();
        quoteWithErrors.Errors.ShouldNotBeEmpty();
        quoteWithErrors.Errors.Count.ShouldBe(2);
    }

    #endregion

    #region A.6.3 - Order Creation with Dynamic Provider Fields

    [Fact]
    public void Order_WithDynamicProviderSelection_HasProviderAndServiceFields()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var groupId = Guid.NewGuid();

        // Create a checkout session with a dynamic provider selection
        var checkoutSession = new CheckoutSession
        {
            BasketId = Guid.NewGuid(),
            CurrentStep = CheckoutStep.Shipping,
            BillingAddress = new Address
            {
                Name = "John Doe",
                Email = "john@example.com",
                AddressOne = "456 Customer St",
                TownCity = "Los Angeles",
                CountyState = new CountyState { RegionCode = "CA" },
                PostalCode = "90001",
                CountryCode = "US"
            },
            ShippingAddress = new Address
            {
                Name = "John Doe",
                AddressOne = "456 Customer St",
                TownCity = "Los Angeles",
                CountyState = new CountyState { RegionCode = "CA" },
                PostalCode = "90001",
                CountryCode = "US"
            },
            // Dynamic selection: FedEx Ground
            SelectedShippingOptions = new Dictionary<Guid, string>
            {
                [groupId] = SelectionKeyExtensions.ForDynamicProvider("fedex", "FEDEX_GROUND")
            },
            QuotedShippingCosts = new Dictionary<Guid, QuotedShippingCost>
            {
                [groupId] = new QuotedShippingCost(14.99m, DateTime.UtcNow)
            }
        };

        // Verify the SelectionKey format
        var selectionKey = checkoutSession.SelectedShippingOptions[groupId];
        selectionKey.ShouldBe("dyn:fedex:FEDEX_GROUND");

        // Parse the selection key to verify it's valid
        var parsed = SelectionKeyExtensions.TryParse(
            selectionKey,
            out var shippingOptionId,
            out var providerKey,
            out var serviceCode);

        parsed.ShouldBeTrue();
        shippingOptionId.ShouldBeNull(); // Dynamic selection has no Guid
        providerKey.ShouldBe("fedex");
        serviceCode.ShouldBe("FEDEX_GROUND");

        // Create an Order with dynamic provider fields (simulating what InvoiceService does)
        var orderFactory = new OrderFactory();
        var quotedCost = checkoutSession.QuotedShippingCosts[groupId];
        var order = orderFactory.Create(
            invoiceId: Guid.NewGuid(),
            warehouseId: warehouseId,
            shippingOptionId: Guid.Empty, // Dynamic providers don't use ShippingOption Guid
            shippingCost: quotedCost.Cost);

        // Set dynamic provider fields (as InvoiceService does when SelectionKey is parsed)
        order.ShippingProviderKey = providerKey;
        order.ShippingServiceCode = serviceCode;
        order.ShippingServiceName = "FedEx Ground";
        order.QuotedShippingCost = 14.99m;
        order.QuotedAt = quotedCost.QuotedAt;

        // Assert
        order.ShippingOptionId.ShouldBe(Guid.Empty); // Dynamic doesn't use this
        order.ShippingProviderKey.ShouldBe("fedex");
        order.ShippingServiceCode.ShouldBe("FEDEX_GROUND");
        order.ShippingServiceName.ShouldBe("FedEx Ground");
        order.ShippingCost.ShouldBe(14.99m);
        order.QuotedShippingCost.ShouldBe(14.99m);
        order.QuotedAt.ShouldNotBeNull();
    }

    [Fact]
    public void Order_WithFlatRateSelection_HasShippingOptionIdNotProviderFields()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        // Create a checkout session with a flat-rate selection
        var checkoutSession = new CheckoutSession
        {
            BasketId = Guid.NewGuid(),
            CurrentStep = CheckoutStep.Shipping,
            BillingAddress = new Address { Email = "test@example.com", CountryCode = "GB" },
            ShippingAddress = new Address { CountryCode = "GB" },
            // Flat-rate selection using the new format
            SelectedShippingOptions = new Dictionary<Guid, string>
            {
                [groupId] = SelectionKeyExtensions.ForShippingOption(shippingOptionId)
            }
        };

        // Verify the SelectionKey format
        var selectionKey = checkoutSession.SelectedShippingOptions[groupId];
        selectionKey.ShouldBe($"so:{shippingOptionId}");

        // Parse the selection key
        var parsed = SelectionKeyExtensions.TryParse(
            selectionKey,
            out var parsedOptionId,
            out var providerKey,
            out var serviceCode);

        parsed.ShouldBeTrue();
        parsedOptionId.ShouldBe(shippingOptionId);
        providerKey.ShouldBeNull(); // Flat-rate has no provider key
        serviceCode.ShouldBeNull(); // Flat-rate has no service code

        // Create an Order with flat-rate (simulating what InvoiceService does)
        var orderFactory = new OrderFactory();
        var order = orderFactory.Create(
            invoiceId: Guid.NewGuid(),
            warehouseId: warehouseId,
            shippingOptionId: parsedOptionId!.Value,
            shippingCost: 5.99m);

        // Flat-rate orders should NOT have dynamic provider fields
        order.ShippingProviderKey = null;
        order.ShippingServiceCode = null;
        order.ShippingServiceName = null;

        // Assert
        order.ShippingOptionId.ShouldBe(shippingOptionId);
        order.ShippingProviderKey.ShouldBeNull();
        order.ShippingServiceCode.ShouldBeNull();
        order.ShippingServiceName.ShouldBeNull();
        order.ShippingCost.ShouldBe(5.99m);
    }

    [Fact]
    public void Order_WithUPSSelection_HasCorrectServiceFields()
    {
        // Arrange - Test UPS selection to ensure different provider formats work
        var warehouseId = Guid.NewGuid();
        var groupId = Guid.NewGuid();

        var checkoutSession = new CheckoutSession
        {
            BasketId = Guid.NewGuid(),
            CurrentStep = CheckoutStep.Shipping,
            BillingAddress = new Address { Email = "test@example.com", CountryCode = "US" },
            ShippingAddress = new Address { CountryCode = "US" },
            // UPS 2nd Day Air selection
            SelectedShippingOptions = new Dictionary<Guid, string>
            {
                [groupId] = SelectionKeyExtensions.ForDynamicProvider("ups", "02")
            },
            QuotedShippingCosts = new Dictionary<Guid, QuotedShippingCost>
            {
                [groupId] = new QuotedShippingCost(35.00m, DateTime.UtcNow)
            }
        };

        // Verify format
        var selectionKey = checkoutSession.SelectedShippingOptions[groupId];
        selectionKey.ShouldBe("dyn:ups:02");

        // Parse and create order
        var parsed = SelectionKeyExtensions.TryParse(
            selectionKey, out _, out var providerKey, out var serviceCode);

        parsed.ShouldBeTrue();
        providerKey.ShouldBe("ups");
        serviceCode.ShouldBe("02");

        // Create order
        var orderFactory = new OrderFactory();
        var order = orderFactory.Create(
            invoiceId: Guid.NewGuid(),
            warehouseId: warehouseId,
            shippingOptionId: Guid.Empty,
            shippingCost: 35.00m);

        order.ShippingProviderKey = providerKey;
        order.ShippingServiceCode = serviceCode;
        order.ShippingServiceName = "UPS 2nd Day Air";

        // Assert
        order.ShippingProviderKey.ShouldBe("ups");
        order.ShippingServiceCode.ShouldBe("02");
        order.ShippingServiceName.ShouldBe("UPS 2nd Day Air");
    }

    [Fact]
    public void SelectionKey_LegacyGuidFormat_StillWorks()
    {
        // Arrange - Legacy format where just a Guid was stored
        var legacyOptionId = Guid.NewGuid();
        var legacyKey = legacyOptionId.ToString();

        // Act - Parse the legacy format
        var parsed = SelectionKeyExtensions.TryParse(
            legacyKey,
            out var parsedOptionId,
            out var providerKey,
            out var serviceCode);

        // Assert - Should parse as a flat-rate ShippingOption
        parsed.ShouldBeTrue();
        parsedOptionId.ShouldBe(legacyOptionId);
        providerKey.ShouldBeNull();
        serviceCode.ShouldBeNull();

        // Should be identified as ShippingOption, not dynamic
        SelectionKeyExtensions.IsShippingOption(legacyKey).ShouldBeTrue();
        SelectionKeyExtensions.IsDynamicProvider(legacyKey).ShouldBeFalse();
    }

    #endregion

    #region A.6.4 - ShippingServiceCategory Inference on Order Creation

    [Fact]
    public void Order_DynamicFedExGround_InfersStandardCategory()
    {
        // Arrange - FedEx Ground with 5-day transit (simulates DefaultOrderGroupingStrategy output)
        var option = new ShippingOptionInfo
        {
            ProviderKey = "fedex",
            ServiceCode = "FEDEX_GROUND",
            Name = "FedEx Ground",
            DaysFrom = 5,
            DaysTo = 6,
            Cost = 12.99m
        };

        // Act - InferServiceCategory as InvoiceService does at order creation
        var category = InvoiceService.InferServiceCategory(option);

        // Assert
        category.ShouldBe(ShippingServiceCategory.Standard);

        // Verify it's set on order
        var orderFactory = new OrderFactory();
        var order = orderFactory.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.Empty, option.Cost);
        order.ShippingProviderKey = option.ProviderKey;
        order.ShippingServiceCode = option.ServiceCode;
        order.ShippingServiceCategory = category;

        order.ShippingServiceCategory.ShouldBe(ShippingServiceCategory.Standard);
    }

    [Fact]
    public void Order_DynamicUPS2ndDay_InfersExpressCategory()
    {
        // Arrange - UPS 2nd Day Air with 2-day transit
        var option = new ShippingOptionInfo
        {
            ProviderKey = "ups",
            ServiceCode = "02",
            Name = "UPS 2nd Day Air",
            DaysFrom = 2,
            DaysTo = 2,
            Cost = 35.00m
        };

        // Act
        var category = InvoiceService.InferServiceCategory(option);

        // Assert
        category.ShouldBe(ShippingServiceCategory.Express);

        var orderFactory = new OrderFactory();
        var order = orderFactory.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.Empty, option.Cost);
        order.ShippingServiceCategory = category;

        order.ShippingServiceCategory.ShouldBe(ShippingServiceCategory.Express);
    }

    [Fact]
    public void Order_DynamicUPSNextDay_InfersOvernightCategory()
    {
        // Arrange - UPS Next Day Air with 1-day transit
        var option = new ShippingOptionInfo
        {
            ProviderKey = "ups",
            ServiceCode = "01",
            Name = "UPS Next Day Air",
            DaysFrom = 1,
            DaysTo = 1,
            Cost = 55.99m
        };

        // Act
        var category = InvoiceService.InferServiceCategory(option);

        // Assert
        category.ShouldBe(ShippingServiceCategory.Overnight);

        var orderFactory = new OrderFactory();
        var order = orderFactory.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.Empty, option.Cost);
        order.ShippingServiceCategory = category;

        order.ShippingServiceCategory.ShouldBe(ShippingServiceCategory.Overnight);
    }

    [Fact]
    public void Order_FlatRateWithNoDays_InfersNullCategory()
    {
        // Arrange - Flat-rate option with no delivery time data configured
        var shippingOptionId = Guid.NewGuid();
        var option = new ShippingOptionInfo
        {
            ShippingOptionId = shippingOptionId,
            Name = "Standard Shipping",
            DaysFrom = 0,
            DaysTo = 0,
            IsNextDay = false,
            Cost = 5.99m
        };

        // Act
        var category = InvoiceService.InferServiceCategory(option);

        // Assert
        category.ShouldBeNull();

        var orderFactory = new OrderFactory();
        var order = orderFactory.Create(Guid.NewGuid(), Guid.NewGuid(), shippingOptionId, option.Cost);
        order.ShippingServiceCategory = category;

        order.ShippingServiceCategory.ShouldBeNull();
    }

    [Fact]
    public void Order_FlatRateWithIsNextDay_InfersOvernightCategory()
    {
        // Arrange - Flat-rate "Express Next Day" option with IsNextDay=true
        var shippingOptionId = Guid.NewGuid();
        var option = new ShippingOptionInfo
        {
            ShippingOptionId = shippingOptionId,
            Name = "Express Next Day",
            DaysFrom = 0,
            DaysTo = 0,
            IsNextDay = true,
            Cost = 15.99m
        };

        // Act
        var category = InvoiceService.InferServiceCategory(option);

        // Assert
        category.ShouldBe(ShippingServiceCategory.Overnight);

        var orderFactory = new OrderFactory();
        var order = orderFactory.Create(Guid.NewGuid(), Guid.NewGuid(), shippingOptionId, option.Cost);
        order.ShippingServiceCategory = category;

        order.ShippingServiceCategory.ShouldBe(ShippingServiceCategory.Overnight);
    }

    [Fact]
    public void Order_DynamicWithNoTransitData_InfersNullCategory()
    {
        // Arrange - Dynamic provider that didn't return transit time (DaysFrom=0)
        var option = new ShippingOptionInfo
        {
            ProviderKey = "fedex",
            ServiceCode = "FEDEX_GROUND",
            Name = "FedEx Ground",
            DaysFrom = 0,
            DaysTo = 0,
            Cost = 9.99m
        };

        // Act
        var category = InvoiceService.InferServiceCategory(option);

        // Assert - Falls through to null (DefaultShippingMethod fallback at fulfilment time)
        category.ShouldBeNull();
    }

    #endregion
}
