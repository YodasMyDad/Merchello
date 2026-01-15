using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Tax.Providers.Models;
using Merchello.Core.Tax.Services.Interfaces;

namespace Merchello.Core.Tax.Providers.BuiltIn;

/// <summary>
/// Manual tax provider that uses TaxGroup/TaxGroupRate for location-based tax calculation.
/// This is the default provider and wraps the existing tax rate system.
/// Supports shipping tax via regional overrides or proportional calculation.
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

    public override ValueTask<IEnumerable<TaxProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<TaxProviderConfigurationField>>(
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

        // Calculate line item taxes
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

                // Calculate tax using currency-aware rounding
                var lineTotal = item.Amount * item.Quantity;
                taxAmount = lineTotal.PercentageAmount(taxRate, request.CurrencyCode, currencyService);
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

        // Calculate shipping tax
        decimal shippingTax = 0;
        if (request.ShippingAmount > 0)
        {
            shippingTax = await CalculateShippingTaxAsync(
                request, lineResults, countryCode, stateCode, cancellationToken);
        }

        return TaxCalculationResult.Successful(
            totalTax: lineResults.Sum(r => r.TaxAmount) + shippingTax,
            lineResults: lineResults,
            shippingTax: shippingTax
        );
    }

    /// <summary>
    /// Calculates shipping tax based on the following priority:
    /// 1. Regional override for destination (country/state) → use that TaxGroup's rate
    /// 2. If global ShippingTaxGroupId set → use that TaxGroup's rate
    /// 3. If IsShippingTaxable = true → use proportional rate (weighted average)
    /// 4. Else → no shipping tax
    /// </summary>
    private async Task<decimal> CalculateShippingTaxAsync(
        TaxCalculationRequest request,
        List<LineTaxResult> lineResults,
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken)
    {
        // 1. Check for regional override (highest priority)
        var shippingOverride = await taxService.GetShippingTaxOverrideAsync(
            countryCode, stateCode, cancellationToken);

        if (shippingOverride != null)
        {
            // Override found - if ShippingTaxGroupId is null, shipping is never taxed in this region
            if (shippingOverride.ShippingTaxGroupId == null)
                return 0;

            // Use the override's tax group rate
            var overrideRate = await taxService.GetApplicableRateAsync(
                shippingOverride.ShippingTaxGroupId.Value,
                countryCode,
                stateCode,
                cancellationToken);

            return request.ShippingAmount.PercentageAmount(overrideRate, request.CurrencyCode, currencyService);
        }

        // 2. Check provider configuration - is shipping taxable?
        var isShippingTaxable = GetConfigBool("isShippingTaxable", false);
        if (!isShippingTaxable)
            return 0;

        // 3. Check for configured shipping tax group
        var shippingTaxGroupIdStr = GetConfigValue("shippingTaxGroupId");
        if (!string.IsNullOrWhiteSpace(shippingTaxGroupIdStr) &&
            Guid.TryParse(shippingTaxGroupIdStr, out var shippingTaxGroupId))
        {
            var configuredRate = await taxService.GetApplicableRateAsync(
                shippingTaxGroupId,
                countryCode,
                stateCode,
                cancellationToken);

            return request.ShippingAmount.PercentageAmount(configuredRate, request.CurrencyCode, currencyService);
        }

        // 4. Proportional calculation (EU/UK compliant - weighted average of line item rates)
        return CalculateProportionalShippingTax(request, lineResults);
    }

    /// <summary>
    /// Checks if shipping is taxed for the given location.
    /// Uses same priority as tax calculation:
    /// 1. Regional override with ShippingTaxGroupId = null → NOT taxed
    /// 2. Regional override with ShippingTaxGroupId → taxed
    /// 3. Global isShippingTaxable = false → NOT taxed
    /// 4. Global isShippingTaxable = true → taxed
    /// </summary>
    public async Task<bool> IsShippingTaxedForLocationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default)
    {
        // Priority 1 & 2: Check regional override
        var shippingOverride = await taxService.GetShippingTaxOverrideAsync(
            countryCode, stateCode, cancellationToken);

        if (shippingOverride != null)
        {
            // ShippingTaxGroupId = null means explicitly NO shipping tax for this region
            return shippingOverride.ShippingTaxGroupId.HasValue;
        }

        // Priority 3 & 4: Check global config
        return GetConfigBool("isShippingTaxable", false);
    }

    /// <summary>
    /// Gets the shipping tax rate for a location.
    /// Uses same 4-tier priority as tax calculation:
    /// 1. Regional override with ShippingTaxGroupId = null → 0% (no tax)
    /// 2. Regional override with ShippingTaxGroupId → that tax group's rate
    /// 3. Configured shippingTaxGroupId → that tax group's rate
    /// 4. Proportional (no tax group configured) → null (cannot determine without line items)
    /// </summary>
    public override async Task<decimal?> GetShippingTaxRateForLocationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default)
    {
        // Priority 1 & 2: Check regional override
        var shippingOverride = await taxService.GetShippingTaxOverrideAsync(
            countryCode, stateCode, cancellationToken);

        if (shippingOverride != null)
        {
            // ShippingTaxGroupId = null means explicitly NO shipping tax for this region
            if (shippingOverride.ShippingTaxGroupId == null)
                return 0m;

            // Use the override's tax group rate
            return await taxService.GetApplicableRateAsync(
                shippingOverride.ShippingTaxGroupId.Value,
                countryCode,
                stateCode,
                cancellationToken);
        }

        // Priority 3: Check global config - is shipping taxable?
        if (!GetConfigBool("isShippingTaxable", false))
            return 0m;

        // Priority 4: Check for configured shipping tax group
        var shippingTaxGroupIdStr = GetConfigValue("shippingTaxGroupId");
        if (!string.IsNullOrWhiteSpace(shippingTaxGroupIdStr) &&
            Guid.TryParse(shippingTaxGroupIdStr, out var shippingTaxGroupId))
        {
            return await taxService.GetApplicableRateAsync(
                shippingTaxGroupId,
                countryCode,
                stateCode,
                cancellationToken);
        }

        // Priority 5: Proportional calculation - cannot determine rate without line items
        return null;
    }

    /// <summary>
    /// Calculates shipping tax using a proportional/weighted average of line item tax rates.
    /// This method is EU/UK compliant for mixed-rate orders.
    /// </summary>
    private decimal CalculateProportionalShippingTax(
        TaxCalculationRequest request,
        List<LineTaxResult> lineResults)
    {
        // Calculate total taxable amount from line items
        var taxableSubtotal = request.LineItems
            .Where(li => li.IsTaxable && li.TaxGroupId.HasValue)
            .Sum(li => li.Amount * li.Quantity);

        // Calculate total tax from line results
        var lineItemTax = lineResults.Sum(r => r.TaxAmount);

        // Use centralized proportional calculation
        return taxCalculationService.CalculateProportionalShippingTax(
            request.ShippingAmount, lineItemTax, taxableSubtotal, request.CurrencyCode);
    }
}
