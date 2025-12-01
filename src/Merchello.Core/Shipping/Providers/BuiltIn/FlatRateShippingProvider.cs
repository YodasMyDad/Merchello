using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;

namespace Merchello.Core.Shipping.Providers.BuiltIn;

/// <summary>
/// Built-in provider that reproduces the legacy flat-rate shipping behaviour.
/// </summary>
public class FlatRateShippingProvider : IShippingProvider
{
    private ShippingProviderConfiguration? _configuration;

    public ShippingProviderMetadata Metadata { get; } = new(
        Key: "flat-rate",
        DisplayName: "Flat Rate Shipping",
        EnabledByDefault: true);

    public ValueTask ConfigureAsync(ShippingProviderConfiguration? configuration, CancellationToken cancellationToken = default)
    {
        _configuration = configuration;
        return ValueTask.CompletedTask;
    }

    public bool IsAvailableFor(ShippingQuoteRequest request)
    {
        return request.Items.Any(item => item.IsShippable);
    }

    public Task<ShippingRateQuote?> GetRatesAsync(ShippingQuoteRequest request, CancellationToken cancellationToken = default)
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
