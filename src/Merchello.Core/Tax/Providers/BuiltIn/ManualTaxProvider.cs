using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Tax.Providers.Models;

namespace Merchello.Core.Tax.Providers.BuiltIn;

/// <summary>
/// Manual tax provider that uses TaxGroup/TaxGroupRate for location-based tax calculation.
/// This is the default provider and wraps the existing tax rate system.
/// </summary>
public class ManualTaxProvider(ITaxService taxService) : TaxProviderBase
{
    public override TaxProviderMetadata Metadata => new(
        Alias: "manual",
        DisplayName: "Manual Tax Rates",
        Icon: "icon-calculator",
        Description: "Define tax rates manually per country/state for each tax group",
        SupportsRealTimeCalculation: false,
        RequiresApiCredentials: false,
        SetupInstructions: "Configure tax rates by editing Tax Groups in the Merchello section."
    );

    public override async Task<TaxCalculationResult> CalculateTaxAsync(
        TaxCalculationRequest request,
        CancellationToken cancellationToken = default)
    {
        // Handle tax-exempt transactions
        if (request.IsTaxExempt)
        {
            return TaxCalculationResult.ZeroTax(request.LineItems);
        }

        // Validate address
        if (string.IsNullOrWhiteSpace(request.ShippingAddress?.CountryCode))
        {
            return TaxCalculationResult.Failed("Shipping address with country code is required for tax calculation.");
        }

        var lineResults = new List<LineTaxResult>();
        var countryCode = request.ShippingAddress.CountryCode;
        var stateCode = request.ShippingAddress.CountyState?.RegionCode;

        foreach (var item in request.LineItems)
        {
            decimal taxRate = 0;
            decimal taxAmount = 0;
            bool isTaxable = item.IsTaxable && item.TaxGroupId.HasValue;

            if (isTaxable && item.TaxGroupId.HasValue)
            {
                // Use existing TaxService to get the applicable rate
                taxRate = await taxService.GetApplicableRateAsync(
                    item.TaxGroupId.Value,
                    countryCode,
                    stateCode,
                    cancellationToken);

                // Calculate tax using the extension method
                var lineTotal = item.Amount * item.Quantity;
                taxAmount = lineTotal.PercentageAmount(taxRate);
            }

            lineResults.Add(new LineTaxResult
            {
                Sku = item.Sku,
                TaxRate = taxRate,
                TaxAmount = taxAmount,
                IsTaxable = isTaxable && taxRate > 0,
                TaxJurisdiction = string.IsNullOrWhiteSpace(stateCode)
                    ? countryCode
                    : $"{countryCode}-{stateCode}"
            });
        }

        return TaxCalculationResult.Successful(
            totalTax: lineResults.Sum(r => r.TaxAmount),
            lineResults: lineResults
        );
    }
}
