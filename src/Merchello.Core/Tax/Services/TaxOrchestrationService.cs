using Merchello.Core.Tax.Services.Interfaces;
using Merchello.Core.Tax.Services.Models;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Providers.Models;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Tax.Services;

public class TaxOrchestrationService(
    ITaxProviderManager taxProviderManager,
    ILogger<TaxOrchestrationService> logger) : ITaxOrchestrationService
{
    public async Task<TaxOrchestrationResult> CalculateAsync(
        TaxOrchestrationRequest request,
        CancellationToken cancellationToken = default)
    {
        var activeProvider = await taxProviderManager.GetActiveProviderAsync(cancellationToken);
        if (activeProvider?.Provider == null)
        {
            return TaxOrchestrationResult.Centralized();
        }

        var providerAlias = activeProvider.Metadata.Alias;
        if (string.Equals(providerAlias, "manual", StringComparison.OrdinalIgnoreCase))
        {
            return TaxOrchestrationResult.Centralized(providerAlias: providerAlias);
        }

        if (string.IsNullOrWhiteSpace(request.ShippingAddress.CountryCode))
        {
            return TaxOrchestrationResult.Centralized(
                providerAlias: providerAlias,
                isEstimated: request.AllowEstimate,
                estimationReason: request.AllowEstimate ? "ShippingAddressMissing" : null,
                warnings:
                [
                    request.AllowEstimate
                        ? "Tax is estimated because shipping address is incomplete."
                        : "Shipping address is incomplete. Falling back to centralized tax calculation."
                ]);
        }

        var providerRequest = new TaxCalculationRequest
        {
            ShippingAddress = request.ShippingAddress,
            BillingAddress = request.BillingAddress,
            CurrencyCode = request.CurrencyCode,
            LineItems = request.LineItems,
            ShippingAmount = request.ShippingAmount,
            CustomerId = request.CustomerId,
            CustomerEmail = request.CustomerEmail,
            IsTaxExempt = request.IsTaxExempt,
            TransactionDate = request.TransactionDate,
            ReferenceNumber = request.ReferenceNumber,
            IsEstimate = request.AllowEstimate
        };

        TaxCalculationResult providerResult;
        try
        {
            providerResult = await activeProvider.Provider.CalculateOrderTaxAsync(providerRequest, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Tax provider '{ProviderAlias}' threw during tax calculation.", providerAlias);

            if (!request.AllowEstimate)
            {
                return TaxOrchestrationResult.Failure(
                    $"Authoritative tax calculation failed for provider '{providerAlias}'.",
                    providerAlias);
            }

            return TaxOrchestrationResult.Centralized(
                providerAlias: providerAlias,
                isEstimated: true,
                estimationReason: "ProviderUnavailable",
                warnings:
                [
                    $"Provider '{providerAlias}' is unavailable. Falling back to estimated tax."
                ]);
        }

        if (providerResult.Success)
        {
            return TaxOrchestrationResult.Provider(providerAlias, providerResult);
        }

        logger.LogWarning(
            "Tax provider '{ProviderAlias}' returned unsuccessful result: {ErrorMessage}",
            providerAlias,
            providerResult.ErrorMessage);

        if (!request.AllowEstimate)
        {
            return TaxOrchestrationResult.Failure(
                providerResult.ErrorMessage ?? "Authoritative tax calculation failed.",
                providerAlias);
        }

        return TaxOrchestrationResult.Centralized(
            providerAlias: providerAlias,
            isEstimated: true,
            estimationReason: "ProviderUnavailable",
            warnings:
            [
                providerResult.ErrorMessage ?? "Provider tax calculation failed. Falling back to estimate."
            ]);
    }
}
