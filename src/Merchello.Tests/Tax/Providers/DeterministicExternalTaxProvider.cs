using Merchello.Core.Shared.Providers;
using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Models;

namespace Merchello.Tests.Tax.Providers;

/// <summary>
/// Deterministic external-style provider used by integration tests.
/// </summary>
public class DeterministicExternalTaxProvider : TaxProviderBase
{
    private decimal _lineRate = 15m;
    private decimal _shippingRate = 10m;
    private bool _shouldFail;
    private bool _fixedShippingRate;

    public override TaxProviderMetadata Metadata => new(
        Alias: "deterministic-external",
        DisplayName: "Deterministic External Provider",
        Icon: "icon-calculator",
        Description: "Deterministic provider for integration tests",
        SupportsRealTimeCalculation: true,
        RequiresApiCredentials: false);

    public override ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
        [
            new ProviderConfigurationField
            {
                Key = "lineRate",
                Label = "Line Rate",
                FieldType = ConfigurationFieldType.Text,
                DefaultValue = "15"
            },
            new ProviderConfigurationField
            {
                Key = "shippingRate",
                Label = "Shipping Rate",
                FieldType = ConfigurationFieldType.Text,
                DefaultValue = "10"
            },
            new ProviderConfigurationField
            {
                Key = "shouldFail",
                Label = "Fail",
                FieldType = ConfigurationFieldType.Checkbox,
                DefaultValue = "false"
            },
            new ProviderConfigurationField
            {
                Key = "fixedShippingRate",
                Label = "Fixed Shipping Rate",
                FieldType = ConfigurationFieldType.Checkbox,
                DefaultValue = "false"
            }
        ]);
    }

    public override async ValueTask ConfigureAsync(
        TaxProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        await base.ConfigureAsync(configuration, cancellationToken);
        _lineRate = decimal.TryParse(GetConfigValue("lineRate"), out var parsedLineRate) ? parsedLineRate : 15m;
        _shippingRate = decimal.TryParse(GetConfigValue("shippingRate"), out var parsedShippingRate) ? parsedShippingRate : 10m;
        _shouldFail = bool.TryParse(GetConfigValue("shouldFail"), out var parsedShouldFail) && parsedShouldFail;
        _fixedShippingRate = bool.TryParse(GetConfigValue("fixedShippingRate"), out var parsedFixedShippingRate) && parsedFixedShippingRate;
    }

    public override Task<TaxCalculationResult> CalculateOrderTaxAsync(
        TaxCalculationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_shouldFail)
        {
            return Task.FromResult(TaxCalculationResult.Failed("Deterministic provider failure."));
        }

        var lineResults = request.LineItems.Select(item =>
        {
            var taxAmount = item.IsTaxable
                ? Math.Round(item.Amount * item.Quantity * (_lineRate / 100m), 2)
                : 0m;

            return new LineTaxResult
            {
                LineItemId = item.LineItemId,
                Sku = item.Sku,
                TaxRate = item.IsTaxable ? _lineRate : 0m,
                TaxAmount = taxAmount,
                IsTaxable = item.IsTaxable,
                TaxJurisdiction = request.ShippingAddress.CountryCode
            };
        }).ToList();

        var shippingTax = Math.Round(request.ShippingAmount * (_shippingRate / 100m), 2);
        var totalTax = lineResults.Sum(l => l.TaxAmount) + shippingTax;

        return Task.FromResult(TaxCalculationResult.Successful(
            totalTax: totalTax,
            lineResults: lineResults,
            shippingTax: shippingTax,
            transactionId: $"deterministic-{request.ReferenceNumber ?? "no-ref"}"));
    }

    public override Task<ShippingTaxConfigurationResult> GetShippingTaxConfigurationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default)
    {
        if (_fixedShippingRate)
        {
            return Task.FromResult(ShippingTaxConfigurationResult.FixedRate(_shippingRate));
        }

        return Task.FromResult(ShippingTaxConfigurationResult.ProviderCalculated());
    }
}
