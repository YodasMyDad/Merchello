using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shipping;

/// <summary>
/// Unit tests for ShippingOptionInfo computed properties.
/// Tests SelectionKey generation (including null ServiceCode fallback)
/// and DeliveryTimeDescription formatting.
/// </summary>
public class ShippingOptionInfoTests
{
    #region SelectionKey Tests

    [Fact]
    public void SelectionKey_FlatRate_ReturnsShippingOptionFormat()
    {
        var optionId = Guid.NewGuid();
        var option = new ShippingOptionInfo
        {
            ShippingOptionId = optionId,
            Name = "Standard Delivery",
            ProviderKey = "flat-rate"
        };

        option.SelectionKey.ShouldBe($"so:{optionId}");
    }

    [Fact]
    public void SelectionKey_DynamicWithServiceCode_ReturnsDynamicFormat()
    {
        var option = new ShippingOptionInfo
        {
            ShippingOptionId = Guid.Empty,
            Name = "FedEx Ground",
            ProviderKey = "fedex",
            ServiceCode = "FEDEX_GROUND"
        };

        option.SelectionKey.ShouldBe("dyn:fedex:FEDEX_GROUND");
    }

    [Fact]
    public void SelectionKey_DynamicWithNullServiceCode_FallsBackToName()
    {
        var option = new ShippingOptionInfo
        {
            ShippingOptionId = Guid.Empty,
            Name = "FedEx Ground",
            ProviderKey = "fedex",
            ServiceCode = null
        };

        option.SelectionKey.ShouldBe("dyn:fedex:FedEx Ground");
    }

    [Fact]
    public void SelectionKey_DynamicWithEmptyServiceCode_FallsBackToName()
    {
        var option = new ShippingOptionInfo
        {
            ShippingOptionId = Guid.Empty,
            Name = "UPS 2nd Day",
            ProviderKey = "ups",
            ServiceCode = ""
        };

        option.SelectionKey.ShouldBe("dyn:ups:UPS 2nd Day");
    }

    [Fact]
    public void SelectionKey_FlatRateWithNonEmptyGuid_UsesGuid_EvenWithServiceCode()
    {
        var optionId = Guid.NewGuid();
        var option = new ShippingOptionInfo
        {
            ShippingOptionId = optionId,
            Name = "Standard",
            ProviderKey = "fedex",
            ServiceCode = "FEDEX_GROUND" // This should be ignored for flat-rate
        };

        // ShippingOptionId takes precedence
        option.SelectionKey.ShouldBe($"so:{optionId}");
    }

    [Fact]
    public void SelectionKey_DynamicWithServiceCode_RoundTrips()
    {
        var option = new ShippingOptionInfo
        {
            ShippingOptionId = Guid.Empty,
            Name = "FedEx Express",
            ProviderKey = "fedex",
            ServiceCode = "FEDEX_EXPRESS_SAVER"
        };

        var key = option.SelectionKey;
        var parsed = SelectionKeyExtensions.TryParse(key, out _, out var provider, out var service);

        parsed.ShouldBeTrue();
        provider.ShouldBe("fedex");
        service.ShouldBe("FEDEX_EXPRESS_SAVER");
    }

    [Fact]
    public void SelectionKey_DynamicWithNullServiceCode_NameRoundTrips()
    {
        var option = new ShippingOptionInfo
        {
            ShippingOptionId = Guid.Empty,
            Name = "Custom Rate",
            ProviderKey = "custom",
            ServiceCode = null
        };

        var key = option.SelectionKey;
        var parsed = SelectionKeyExtensions.TryParse(key, out _, out var provider, out var service);

        parsed.ShouldBeTrue();
        provider.ShouldBe("custom");
        service.ShouldBe("Custom Rate");
    }

    #endregion

    #region DeliveryTimeDescription Tests

    [Fact]
    public void DeliveryTimeDescription_IsNextDay_ReturnsNextDayDelivery()
    {
        var option = new ShippingOptionInfo
        {
            IsNextDay = true,
            DaysFrom = 0,
            DaysTo = 0
        };

        option.DeliveryTimeDescription.ShouldBe("Next Day Delivery");
    }

    [Fact]
    public void DeliveryTimeDescription_IsNextDay_IgnoresDaysFields()
    {
        var option = new ShippingOptionInfo
        {
            IsNextDay = true,
            DaysFrom = 5,
            DaysTo = 7
        };

        option.DeliveryTimeDescription.ShouldBe("Next Day Delivery");
    }

    [Fact]
    public void DeliveryTimeDescription_ZeroDays_ReturnsEmptyString()
    {
        var option = new ShippingOptionInfo
        {
            IsNextDay = false,
            DaysFrom = 0,
            DaysTo = 0
        };

        option.DeliveryTimeDescription.ShouldBe(string.Empty);
    }

    [Fact]
    public void DeliveryTimeDescription_NegativeDays_ReturnsEmptyString()
    {
        var option = new ShippingOptionInfo
        {
            IsNextDay = false,
            DaysFrom = -1,
            DaysTo = -1
        };

        option.DeliveryTimeDescription.ShouldBe(string.Empty);
    }

    [Fact]
    public void DeliveryTimeDescription_NormalRange_ReturnsFormattedDays()
    {
        var option = new ShippingOptionInfo
        {
            IsNextDay = false,
            DaysFrom = 3,
            DaysTo = 5
        };

        option.DeliveryTimeDescription.ShouldBe("3-5 days");
    }

    [Fact]
    public void DeliveryTimeDescription_SameDay_ReturnsRange()
    {
        var option = new ShippingOptionInfo
        {
            IsNextDay = false,
            DaysFrom = 2,
            DaysTo = 2
        };

        option.DeliveryTimeDescription.ShouldBe("2-2 days");
    }

    [Fact]
    public void DeliveryTimeDescription_DaysFromZero_DaysToPositive_ReturnsRange()
    {
        // If DaysFrom is 0 but DaysTo is positive, still shows range
        var option = new ShippingOptionInfo
        {
            IsNextDay = false,
            DaysFrom = 0,
            DaysTo = 3
        };

        // DaysFrom <= 0 && DaysTo <= 0 is false, so it shows the range
        option.DeliveryTimeDescription.ShouldBe("0-3 days");
    }

    [Fact]
    public void DeliveryTimeDescription_DaysFromPositive_DaysToZero_ReturnsRange()
    {
        // If DaysFrom is positive but DaysTo is 0, still shows range
        var option = new ShippingOptionInfo
        {
            IsNextDay = false,
            DaysFrom = 3,
            DaysTo = 0
        };

        // DaysFrom <= 0 is false, so it shows the range
        option.DeliveryTimeDescription.ShouldBe("3-0 days");
    }

    #endregion
}
