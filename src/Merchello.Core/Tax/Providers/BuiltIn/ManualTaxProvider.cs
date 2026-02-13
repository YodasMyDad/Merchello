using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Providers;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Tax.Providers.Models;
using Merchello.Core.Tax.Services.Interfaces;

namespace Merchello.Core.Tax.Providers.BuiltIn;

/// <summary>
/// Manual tax provider that uses TaxGroup and TaxGroupRate for location-based tax calculation.
/// Supports shipping tax via regional overrides, fixed shipping tax groups, or proportional mode.
/// </summary>
public class ManualTaxProvider(
    ITaxService taxService,
    ICurrencyService currencyService,
    ITaxCalculationService taxCalculationService) : TaxProviderBase
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

    public override ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
        [
            new()
            {
                Key = "isShippingTaxable",
                Label = "Tax Shipping",
                FieldType = ConfigurationFieldType.Checkbox,
                DefaultValue = "false",
                IsRequired = false,
                Description = "Enable tax on shipping costs. Regional overrides take precedence over this setting."
            },
            new()
            {
                Key = "shippingTaxGroupId",
                Label = "Shipping Tax Group",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                Description = "Tax group for shipping. Leave empty to use proportional rate (weighted average of line items). Regional overrides take precedence."
            }
        ]);
    }

    public override async Task<TaxCalculationResult> CalculateOrderTaxAsync(
        TaxCalculationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.IsTaxExempt)
        {
            return TaxCalculationResult.ZeroTax(request.LineItems);
        }

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
            var isTaxable = item.IsTaxable && item.TaxGroupId.HasValue;

            if (isTaxable && item.TaxGroupId.HasValue)
            {
                taxRate = await taxService.GetApplicableRateAsync(
                    item.TaxGroupId.Value,
                    countryCode,
                    stateCode,
                    cancellationToken);

                var lineTotal = item.Amount * item.Quantity;
                taxAmount = lineTotal.PercentageAmount(taxRate, request.CurrencyCode, currencyService);
            }

            lineResults.Add(new LineTaxResult
            {
                LineItemId = item.LineItemId,
                Sku = item.Sku,
                TaxRate = taxRate,
                TaxAmount = taxAmount,
                IsTaxable = isTaxable,
                TaxJurisdiction = string.IsNullOrWhiteSpace(stateCode)
                    ? countryCode
                    : $"{countryCode}-{stateCode}"
            });
        }

        var shippingTax = 0m;
        if (request.ShippingAmount > 0)
        {
            shippingTax = await CalculateShippingTaxAsync(
                request,
                lineResults,
                countryCode,
                stateCode,
                cancellationToken);
        }

        return TaxCalculationResult.Successful(
            totalTax: lineResults.Sum(r => r.TaxAmount) + shippingTax,
            lineResults: lineResults,
            shippingTax: shippingTax);
    }

    public override async Task<ShippingTaxConfigurationResult> GetShippingTaxConfigurationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default)
    {
        var shippingOverride = await taxService.GetShippingTaxOverrideAsync(
            countryCode,
            stateCode,
            cancellationToken);

        if (shippingOverride != null)
        {
            if (!shippingOverride.ShippingTaxGroupId.HasValue)
            {
                return ShippingTaxConfigurationResult.NotTaxed();
            }

            var overrideRate = await taxService.GetApplicableRateAsync(
                shippingOverride.ShippingTaxGroupId.Value,
                countryCode,
                stateCode,
                cancellationToken);

            return ShippingTaxConfigurationResult.FixedRate(overrideRate);
        }

        if (!GetConfigBool("isShippingTaxable", false))
        {
            return ShippingTaxConfigurationResult.NotTaxed();
        }

        var shippingTaxGroupIdStr = GetConfigValue("shippingTaxGroupId");
        if (!string.IsNullOrWhiteSpace(shippingTaxGroupIdStr) &&
            Guid.TryParse(shippingTaxGroupIdStr, out var shippingTaxGroupId))
        {
            var configuredRate = await taxService.GetApplicableRateAsync(
                shippingTaxGroupId,
                countryCode,
                stateCode,
                cancellationToken);

            return ShippingTaxConfigurationResult.FixedRate(configuredRate);
        }

        return ShippingTaxConfigurationResult.Proportional();
    }

    // Legacy helpers retained on the concrete manual provider for internal test compatibility.
    public async Task<bool> IsShippingTaxedForLocationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default)
    {
        var config = await GetShippingTaxConfigurationAsync(countryCode, stateCode, cancellationToken);
        return config.Mode != ShippingTaxMode.NotTaxed;
    }

    // Legacy helper retained on the concrete manual provider for internal test compatibility.
    public async Task<decimal?> GetShippingTaxRateForLocationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default)
    {
        var config = await GetShippingTaxConfigurationAsync(countryCode, stateCode, cancellationToken);
        return config.Mode == ShippingTaxMode.FixedRate ? config.Rate : null;
    }

    private async Task<decimal> CalculateShippingTaxAsync(
        TaxCalculationRequest request,
        List<LineTaxResult> lineResults,
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken)
    {
        var shippingConfiguration = await GetShippingTaxConfigurationAsync(
            countryCode,
            stateCode,
            cancellationToken);

        if (shippingConfiguration.Mode == ShippingTaxMode.NotTaxed)
        {
            return 0m;
        }

        if (shippingConfiguration.Mode == ShippingTaxMode.FixedRate &&
            shippingConfiguration.Rate.HasValue)
        {
            return request.ShippingAmount.PercentageAmount(
                shippingConfiguration.Rate.Value,
                request.CurrencyCode,
                currencyService);
        }

        return CalculateProportionalShippingTax(request, lineResults);
    }

    private decimal CalculateProportionalShippingTax(
        TaxCalculationRequest request,
        List<LineTaxResult> lineResults)
    {
        var taxableSubtotal = request.LineItems
            .Where(li => li.IsTaxable && li.TaxGroupId.HasValue)
            .Sum(li => li.Amount * li.Quantity);

        var lineItemTax = lineResults.Sum(r => r.TaxAmount);

        return taxCalculationService.CalculateProportionalShippingTax(
            request.ShippingAmount,
            lineItemTax,
            taxableSubtotal,
            request.CurrencyCode);
    }
}
