using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Base class for shipping providers with default implementations for optional methods.
/// </summary>
public abstract class ShippingProviderBase : IShippingProvider
{
    /// <summary>
    /// Stored configuration after ConfigureAsync is called.
    /// </summary>
    protected ShippingProviderConfiguration? Configuration { get; private set; }

    /// <inheritdoc />
    public abstract ShippingProviderMetadata Metadata { get; }

    /// <inheritdoc />
    public virtual ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult(Enumerable.Empty<ShippingProviderConfigurationField>());
    }

    /// <inheritdoc />
    public virtual ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetMethodConfigFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult(Enumerable.Empty<ShippingProviderConfigurationField>());
    }

    /// <inheritdoc />
    /// <remarks>
    /// Default implementation returns an empty list for providers without service types (e.g., flat-rate).
    /// External providers (FedEx, UPS) should override to return their supported service types.
    /// </remarks>
    public virtual ValueTask<IReadOnlyList<ShippingServiceType>> GetSupportedServiceTypesAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IReadOnlyList<ShippingServiceType>>(Array.Empty<ShippingServiceType>());
    }

    /// <inheritdoc />
    public virtual ValueTask ConfigureAsync(ShippingProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        Configuration = configuration;
        return ValueTask.CompletedTask;
    }

    /// <inheritdoc />
    public abstract bool IsAvailableFor(ShippingQuoteRequest request);

    /// <inheritdoc />
    public abstract Task<ShippingRateQuote?> GetRatesAsync(ShippingQuoteRequest request,
        CancellationToken cancellationToken = default);

    /// <inheritdoc />
    /// <remarks>
    /// Default implementation calls GetRatesAsync and filters results by service type.
    /// External providers should override to filter at the API level for efficiency.
    /// </remarks>
    public virtual async Task<ShippingRateQuote?> GetRatesForServicesAsync(
        ShippingQuoteRequest request,
        IReadOnlyList<string> serviceTypes,
        IReadOnlyList<ShippingOptionSnapshot> shippingOptions,
        CancellationToken cancellationToken = default)
    {
        // Default: get all rates and filter
        var quote = await GetRatesAsync(request, cancellationToken);
        if (quote == null)
            return null;

        // Filter to only requested service types using the concrete ServiceType property
        var serviceTypeSet = new HashSet<string>(serviceTypes, StringComparer.OrdinalIgnoreCase);
        var filteredLevels = quote.ServiceLevels
            .Where(sl =>
            {
                // Primary: use the concrete ServiceType property
                if (sl.ServiceType?.Code is not null && serviceTypeSet.Contains(sl.ServiceType.Code))
                {
                    return true;
                }

                // Fallback for flat-rate providers without service types: match ServiceCode directly
                return serviceTypeSet.Contains(sl.ServiceCode);
            })
            .ToList();

        return new ShippingRateQuote
        {
            ProviderKey = quote.ProviderKey,
            ProviderName = quote.ProviderName,
            ServiceLevels = filteredLevels,
            Errors = quote.Errors
        };
    }

    /// <inheritdoc />
    /// <remarks>
    /// Default implementation returns empty list (no delivery date selection).
    /// Override to provide available delivery dates.
    /// </remarks>
    public virtual Task<List<DateTime>> GetAvailableDeliveryDatesAsync(
        ShippingQuoteRequest request,
        ShippingServiceLevel serviceLevel,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new List<DateTime>());
    }

    /// <inheritdoc />
    /// <remarks>
    /// Default implementation returns 0 (no surcharge).
    /// Override to calculate date-specific surcharges.
    /// </remarks>
    public virtual Task<decimal> CalculateDeliveryDateSurchargeAsync(
        ShippingQuoteRequest request,
        ShippingServiceLevel serviceLevel,
        DateTime requestedDate,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(0m);
    }

    /// <inheritdoc />
    /// <remarks>
    /// Default implementation returns true (all dates valid).
    /// Override to validate specific dates.
    /// </remarks>
    public virtual Task<bool> ValidateDeliveryDateAsync(
        ShippingQuoteRequest request,
        ShippingServiceLevel serviceLevel,
        DateTime requestedDate,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(true);
    }
}
