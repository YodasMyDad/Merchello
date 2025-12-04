using Merchello.Core.Shipping.Providers;

namespace Merchello.Core.Shipping.Providers.BuiltIn;

/// <summary>
/// Built-in provider that reproduces the legacy flat-rate shipping behaviour.
/// Uses ShippingOption and ShippingCost tables for rate calculations.
/// </summary>
public class FlatRateShippingProvider : ShippingProviderBase
{
    /// <inheritdoc />
    public override ShippingProviderMetadata Metadata { get; } = new()
    {
        Key = "flat-rate",
        DisplayName = "Flat Rate Shipping",
        Icon = "icon-truck",
        Description = "Configure flat shipping rates based on destination country and region.",
        SupportsRealTimeRates = false,
        SupportsTracking = false,
        SupportsLabelGeneration = false,
        SupportsDeliveryDateSelection = true,
        SupportsInternational = true,
        RequiresFullAddress = false
    };

    /// <inheritdoc />
    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        return request.Items.Any(item => item.IsShippable);
    }

    /// <inheritdoc />
    public override Task<ShippingRateQuote?> GetRatesAsync(ShippingQuoteRequest request, CancellationToken cancellationToken = default)
    {
        if (!IsAvailableFor(request))
        {
            return Task.FromResult<ShippingRateQuote?>(null);
        }

        decimal shippingCost = 0;
        var errors = new List<string>();

        foreach (var item in request.Items.Where(i => i.IsShippable))
        {
            if (item.DestinationCost.HasValue)
            {
                shippingCost += item.DestinationCost.Value;
                continue;
            }

            if (item.ProductSnapshot is { ShippingOptions: { Count: > 0 } options })
            {
                var option = options.FirstOrDefault(o => o.CanShipToDestination);
                var resolvedCost = option?.DestinationCost ??
                                   option?.Costs.FirstOrDefault(cost => cost.CountryCode == request.CountryCode)?.Cost;

                if (resolvedCost.HasValue)
                {
                    shippingCost += resolvedCost.Value;
                    continue;
                }
            }

            errors.Add(item.ProductSnapshot?.Name != null
                ? $"Unable to ship {item.ProductSnapshot.Name} to {request.CountryCode}."
                : "Unable to resolve shipping for an item in the basket.");
        }

        if (shippingCost < 0)
        {
            shippingCost = 0;
        }

        var serviceLevels = new List<ShippingServiceLevel>
        {
            new()
            {
                ServiceCode = "flat-standard",
                ServiceName = "Standard Shipping",
                TotalCost = shippingCost,
                CurrencyCode = request.CurrencyCode ?? "GBP"
            }
        };

        var quote = new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels = serviceLevels,
            Errors = errors
        };

        return Task.FromResult<ShippingRateQuote?>(quote);
    }
}
