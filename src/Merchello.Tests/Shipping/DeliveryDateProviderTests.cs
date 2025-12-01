using Merchello.Core.Accounting.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shipping;

public class DeliveryDateProviderTests
{
    private readonly DefaultDeliveryDateProvider _provider;

    public DeliveryDateProviderTests()
    {
        _provider = new DefaultDeliveryDateProvider();
    }

    [Fact]
    public async Task GetAvailableDatesAsync_WhenNotAllowed_ReturnsEmptyList()
    {
        // Arrange
        var shippingOption = new ShippingOption
        {
            AllowsDeliveryDateSelection = false
        };

        // Act
        var result = await _provider.GetAvailableDatesAsync(
            shippingOption,
            new Address(),
            [],
            CancellationToken.None);

        // Assert
        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetAvailableDatesAsync_WithMinAndMaxDays_ReturnsDateRange()
    {
        // Arrange
        var shippingOption = new ShippingOption
        {
            AllowsDeliveryDateSelection = true,
            MinDeliveryDays = 2,
            MaxDeliveryDays = 5
        };

        // Act
        var result = await _provider.GetAvailableDatesAsync(
            shippingOption,
            new Address(),
            [],
            CancellationToken.None);

        // Assert
        result.ShouldNotBeEmpty();
        result.Count.ShouldBe(4); // Days 2, 3, 4, 5
        result.Min().ShouldBe(DateTime.UtcNow.Date.AddDays(2));
        result.Max().ShouldBe(DateTime.UtcNow.Date.AddDays(5));
    }

    [Fact]
    public async Task GetAvailableDatesAsync_WithWeekdaysOnly_FiltersWeekends()
    {
        // Arrange
        var shippingOption = new ShippingOption
        {
            AllowsDeliveryDateSelection = true,
            MinDeliveryDays = 1,
            MaxDeliveryDays = 10,
            AllowedDaysOfWeek = "1,2,3,4,5" // Monday to Friday
        };

        // Act
        var result = await _provider.GetAvailableDatesAsync(
            shippingOption,
            new Address(),
            [],
            CancellationToken.None);

        // Assert
        result.ShouldNotBeEmpty();
        result.ShouldAllBe(date => date.DayOfWeek != DayOfWeek.Saturday && date.DayOfWeek != DayOfWeek.Sunday);
    }

    [Fact]
    public async Task CalculateSurchargeAsync_ReturnsZero()
    {
        // Arrange
        var shippingOption = new ShippingOption
        {
            AllowsDeliveryDateSelection = true
        };

        // Act
        var result = await _provider.CalculateSurchargeAsync(
            shippingOption,
            DateTime.UtcNow.AddDays(3),
            new Address(),
            [],
            10.00m,
            CancellationToken.None);

        // Assert
        result.ShouldBe(0m);
    }

    [Fact]
    public async Task ValidateDeliveryDateAsync_WhenNotAllowed_ReturnsFalse()
    {
        // Arrange
        var shippingOption = new ShippingOption
        {
            AllowsDeliveryDateSelection = false
        };

        // Act
        var result = await _provider.ValidateDeliveryDateAsync(
            shippingOption,
            DateTime.UtcNow.AddDays(3),
            new Address(),
            CancellationToken.None);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task ValidateDeliveryDateAsync_WhenDateInPast_ReturnsFalse()
    {
        // Arrange
        var shippingOption = new ShippingOption
        {
            AllowsDeliveryDateSelection = true,
            MinDeliveryDays = 2,
            MaxDeliveryDays = 10
        };

        // Act
        var result = await _provider.ValidateDeliveryDateAsync(
            shippingOption,
            DateTime.UtcNow.AddDays(-1),
            new Address(),
            CancellationToken.None);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task ValidateDeliveryDateAsync_WhenDateTooSoon_ReturnsFalse()
    {
        // Arrange
        var shippingOption = new ShippingOption
        {
            AllowsDeliveryDateSelection = true,
            MinDeliveryDays = 5,
            MaxDeliveryDays = 10
        };

        // Act
        var result = await _provider.ValidateDeliveryDateAsync(
            shippingOption,
            DateTime.UtcNow.AddDays(2), // Too soon (min is 5 days)
            new Address(),
            CancellationToken.None);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task ValidateDeliveryDateAsync_WhenDateTooFar_ReturnsFalse()
    {
        // Arrange
        var shippingOption = new ShippingOption
        {
            AllowsDeliveryDateSelection = true,
            MinDeliveryDays = 2,
            MaxDeliveryDays = 5
        };

        // Act
        var result = await _provider.ValidateDeliveryDateAsync(
            shippingOption,
            DateTime.UtcNow.AddDays(10), // Too far (max is 5 days)
            new Address(),
            CancellationToken.None);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task ValidateDeliveryDateAsync_WhenDateOnWeekendButNotAllowed_ReturnsFalse()
    {
        // Arrange
        var shippingOption = new ShippingOption
        {
            AllowsDeliveryDateSelection = true,
            MinDeliveryDays = 1,
            MaxDeliveryDays = 14,
            AllowedDaysOfWeek = "1,2,3,4,5" // Weekdays only
        };

        // Find next Saturday or Sunday
        var today = DateTime.UtcNow.Date;
        var nextWeekend = today.AddDays(1);
        while (nextWeekend.DayOfWeek != DayOfWeek.Saturday && nextWeekend.DayOfWeek != DayOfWeek.Sunday)
        {
            nextWeekend = nextWeekend.AddDays(1);
        }

        // Act
        var result = await _provider.ValidateDeliveryDateAsync(
            shippingOption,
            nextWeekend,
            new Address(),
            CancellationToken.None);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task ValidateDeliveryDateAsync_WhenDateValid_ReturnsTrue()
    {
        // Arrange
        var shippingOption = new ShippingOption
        {
            AllowsDeliveryDateSelection = true,
            MinDeliveryDays = 2,
            MaxDeliveryDays = 10
        };

        // Act
        var result = await _provider.ValidateDeliveryDateAsync(
            shippingOption,
            DateTime.UtcNow.AddDays(5), // Within range
            new Address(),
            CancellationToken.None);

        // Assert
        result.ShouldBeTrue();
    }
}

