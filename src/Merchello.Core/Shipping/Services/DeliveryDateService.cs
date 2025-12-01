using Merchello.Core.Accounting.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Reflection;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Shipping.Services;

public class DeliveryDateService(
    ExtensionManager extensionManager,
    IDeliveryDateProvider defaultProvider,
    ILogger<DeliveryDateService> logger) : IDeliveryDateService
{
    private readonly ExtensionManager _extensionManager = extensionManager;
    private readonly IDeliveryDateProvider _defaultProvider = defaultProvider;
    private readonly ILogger<DeliveryDateService> _logger = logger;

    public async Task<List<DateTime>> GetAvailableDatesForShippingOptionAsync(
        ShippingOption shippingOption,
        Address shippingAddress,
        List<LineItem> items,
        CancellationToken cancellationToken = default)
    {
        if (!shippingOption.AllowsDeliveryDateSelection)
        {
            return [];
        }

        var provider = GetProvider(shippingOption);

        try
        {
            return await provider.GetAvailableDatesAsync(shippingOption, shippingAddress, items, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available delivery dates for shipping option {ShippingOptionId}", shippingOption.Id);
            return [];
        }
    }

    public async Task<decimal> CalculateDeliveryDateSurchargeAsync(
        ShippingOption shippingOption,
        DateTime requestedDate,
        Address shippingAddress,
        List<LineItem> items,
        decimal baseShippingCost,
        CancellationToken cancellationToken = default)
    {
        if (!shippingOption.AllowsDeliveryDateSelection)
        {
            return 0m;
        }

        var provider = GetProvider(shippingOption);

        try
        {
            return await provider.CalculateSurchargeAsync(
                shippingOption,
                requestedDate,
                shippingAddress,
                items,
                baseShippingCost,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating delivery date surcharge for shipping option {ShippingOptionId}", shippingOption.Id);
            return 0m;
        }
    }

    public async Task<bool> ValidateDeliveryDateAsync(
        ShippingOption shippingOption,
        DateTime requestedDate,
        Address shippingAddress,
        CancellationToken cancellationToken = default)
    {
        if (!shippingOption.AllowsDeliveryDateSelection)
        {
            return false;
        }

        var provider = GetProvider(shippingOption);

        try
        {
            return await provider.ValidateDeliveryDateAsync(
                shippingOption,
                requestedDate,
                shippingAddress,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating delivery date for shipping option {ShippingOptionId}", shippingOption.Id);
            return false;
        }
    }

    public HashSet<int>? ParseAllowedDaysOfWeek(string? allowedDaysOfWeek)
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

    private IDeliveryDateProvider GetProvider(ShippingOption shippingOption)
    {
        if (string.IsNullOrWhiteSpace(shippingOption.DeliveryDatePricingMethod))
        {
            return _defaultProvider;
        }

        try
        {
            var providers = _extensionManager.GetInstances<IDeliveryDateProvider>().ToList();
            var provider = providers.FirstOrDefault(p =>
                p?.GetType().FullName == shippingOption.DeliveryDatePricingMethod);

            if (provider != null)
            {
                return provider;
            }

            _logger.LogWarning(
                "Delivery date provider {ProviderType} not found for shipping option {ShippingOptionId}, using default provider",
                shippingOption.DeliveryDatePricingMethod,
                shippingOption.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error loading delivery date provider {ProviderType} for shipping option {ShippingOptionId}, using default provider",
                shippingOption.DeliveryDatePricingMethod,
                shippingOption.Id);
        }

        return _defaultProvider;
    }
}

