using Merchello.Core.Accounting.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers.Models;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Default delivery date provider with basic date calculation logic
/// </summary>
public class DefaultDeliveryDateProvider : IDeliveryDateProvider
{
    public DeliveryDateProviderMetadata Metadata => new()
    {
        Key = "default",
        Name = "Default Delivery Date Provider",
        Description = "Basic delivery date calculation using min/max days and allowed weekdays"
    };

    public Task<List<DateTime>> GetAvailableDatesAsync(
        ShippingOption shippingOption,
        Address shippingAddress,
        List<LineItem> items,
        CancellationToken cancellationToken = default)
    {
        if (!shippingOption.AllowsDeliveryDateSelection)
        {
            return Task.FromResult(new List<DateTime>());
        }

        var today = DateTime.UtcNow.Date;
        var minDays = shippingOption.MinDeliveryDays ?? shippingOption.DaysFrom;
        var maxDays = shippingOption.MaxDeliveryDays ?? shippingOption.DaysTo;

        var startDate = today.AddDays(minDays);
        var endDate = today.AddDays(maxDays);

        var allowedDaysOfWeek = ParseAllowedDaysOfWeek(shippingOption.AllowedDaysOfWeek);
        var availableDates = new List<DateTime>();

        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            if (allowedDaysOfWeek == null || allowedDaysOfWeek.Contains((int)date.DayOfWeek))
            {
                availableDates.Add(date);
            }
        }

        return Task.FromResult(availableDates);
    }

    public Task<decimal> CalculateSurchargeAsync(
        ShippingOption shippingOption,
        DateTime requestedDate,
        Address shippingAddress,
        List<LineItem> items,
        decimal baseShippingCost,
        CancellationToken cancellationToken = default)
    {
        // Default provider returns no surcharge
        // Custom providers can implement complex pricing logic here
        return Task.FromResult(0m);
    }

    public Task<bool> ValidateDeliveryDateAsync(
        ShippingOption shippingOption,
        DateTime requestedDate,
        Address shippingAddress,
        CancellationToken cancellationToken = default)
    {
        if (!shippingOption.AllowsDeliveryDateSelection)
        {
            return Task.FromResult(false);
        }

        var today = DateTime.UtcNow.Date;
        var requestedDateOnly = requestedDate.Date;

        // Check if date is in the past
        if (requestedDateOnly < today)
        {
            return Task.FromResult(false);
        }

        // Check minimum days
        var minDays = shippingOption.MinDeliveryDays ?? shippingOption.DaysFrom;
        var minDate = today.AddDays(minDays);
        if (requestedDateOnly < minDate)
        {
            return Task.FromResult(false);
        }

        // Check maximum days
        var maxDays = shippingOption.MaxDeliveryDays ?? shippingOption.DaysTo;
        var maxDate = today.AddDays(maxDays);
        if (requestedDateOnly > maxDate)
        {
            return Task.FromResult(false);
        }

        // Check allowed days of week
        var allowedDaysOfWeek = ParseAllowedDaysOfWeek(shippingOption.AllowedDaysOfWeek);
        if (allowedDaysOfWeek != null && !allowedDaysOfWeek.Contains((int)requestedDateOnly.DayOfWeek))
        {
            return Task.FromResult(false);
        }

        return Task.FromResult(true);
    }

    private static HashSet<int>? ParseAllowedDaysOfWeek(string? allowedDaysOfWeek)
    {
        if (string.IsNullOrWhiteSpace(allowedDaysOfWeek))
        {
            return null;
        }

        var days = allowedDaysOfWeek
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(day => day.Trim())
            .Where(day => int.TryParse(day, out var dayNum) && dayNum >= 0 && dayNum <= 6)
            .Select(int.Parse)
            .ToHashSet();

        return days.Any() ? days : null;
    }
}

