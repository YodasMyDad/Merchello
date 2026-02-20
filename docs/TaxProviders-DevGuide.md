# Tax Provider Development Guide

Last verified: 2026-02-20

This guide is the current source of truth for implementing custom tax providers in Merchello.
It is based on the live code paths in `src/Merchello.Core` and `src/Merchello`.

Built-in providers:
- Manual provider: `src/Merchello.Core/Tax/Providers/BuiltIn/ManualTaxProvider.cs`
- Avalara provider: `src/Merchello.Core/Tax/Providers/BuiltIn/AvalaraTaxProvider.cs`

## 1. How The Tax Pipeline Actually Runs

### 1.1 Runtime Flow (checkout + invoice)

Primary tax flow for external providers:
1. `CheckoutService.CalculateBasketAsync()` or invoice recalculation builds `TaxableLineItem` inputs.
   - Source line types are `Product`, `Custom`, and `Addon` only.
   - Discount line items are not sent directly to external providers.
2. `TaxOrchestrationService.CalculateAsync()` resolves active provider from `ITaxProviderManager`.
3. If active alias is `manual`, orchestration uses centralized calculation path (no external provider call).
4. If active alias is external and shipping country is present, orchestration calls `provider.CalculateOrderTaxAsync()`.
5. On provider success, Merchello applies authoritative line tax rates and tax total from provider result.
6. On provider failure:
- checkout (`AllowEstimate = true`): fallback to centralized estimate
- invoice/edit (`AllowEstimate = false`): fail closed

Shipping tax configuration flow:
1. Services call `ITaxProviderManager.GetShippingTaxConfigurationAsync(countryCode, stateCode)`.
2. Provider returns mode-based result (`NotTaxed`, `FixedRate`, `Proportional`, `ProviderCalculated`).
3. Centralized math uses mode/rate when provider tax is not authoritative for that request.

Key entry points:
- `src/Merchello.Core/Checkout/Services/CheckoutService.cs`
- `src/Merchello.Core/Accounting/Services/InvoiceService.cs`
- `src/Merchello.Core/Accounting/Services/InvoiceEditService.cs`
- `src/Merchello.Core/Storefront/Services/StorefrontContextService.cs`

### 1.2 Provider discovery and activation

- Providers are discovered by `ExtensionManager` from scanned assemblies.
- Startup scans loaded assemblies for `ITaxProvider` implementations.
- Exactly one provider is active at a time.
- If none active, `TaxProviderManager` defaults to `manual` when available.

References:
- `src/Merchello/Startup.cs`
- `src/Merchello.Core/Tax/Providers/TaxProviderManager.cs`
- `src/Merchello.Core/Shared/Reflection/ExtensionManager.cs`

## 2. Current Contracts (Exact)

### 2.1 ITaxProvider

```csharp
public interface ITaxProvider
{
    TaxProviderMetadata Metadata { get; }

    ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default);

    ValueTask ConfigureAsync(
        TaxProviderConfiguration? configuration,
        CancellationToken cancellationToken = default);

    Task<TaxCalculationResult> CalculateOrderTaxAsync(
        TaxCalculationRequest request,
        CancellationToken cancellationToken = default);

    Task<TaxProviderValidationResult> ValidateConfigurationAsync(
        CancellationToken cancellationToken = default);

    Task<ShippingTaxConfigurationResult> GetShippingTaxConfigurationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default);
}
```

Reference: `src/Merchello.Core/Tax/Providers/Interfaces/ITaxProvider.cs`

### 2.2 ITaxProviderManager

```csharp
public interface ITaxProviderManager
{
    Task<IReadOnlyCollection<RegisteredTaxProvider>> GetProvidersAsync(CancellationToken cancellationToken = default);
    Task<RegisteredTaxProvider?> GetActiveProviderAsync(CancellationToken cancellationToken = default);
    Task<bool> SetActiveProviderAsync(string alias, CancellationToken cancellationToken = default);
    Task<bool> SaveProviderSettingsAsync(string alias, Dictionary<string, string> settings, CancellationToken cancellationToken = default);
    Task<ShippingTaxConfigurationResult> GetShippingTaxConfigurationAsync(string countryCode, string? stateCode, CancellationToken cancellationToken = default);
}
```

Reference: `src/Merchello.Core/Tax/Providers/Interfaces/ITaxProviderManager.cs`

### 2.3 Models you must match

Important model details:
- `TaxCalculationRequest.IsEstimate` exists and is set by orchestration.
- `TaxableLineItem.LineItemId` exists for deterministic mapping.
- `TaxCalculationResult` includes estimate metadata:
- `IsEstimated`
- `EstimationReason`
- `Warnings`

References:
- `src/Merchello.Core/Tax/Providers/Models/TaxCalculationRequest.cs`
- `src/Merchello.Core/Tax/Providers/Models/TaxableLineItem.cs`
- `src/Merchello.Core/Tax/Providers/Models/TaxCalculationResult.cs`
- `src/Merchello.Core/Tax/Providers/Models/LineTaxResult.cs`

### 2.4 Shipping tax mode semantics

`ShippingTaxConfigurationResult.Mode` meaning:
- `NotTaxed`: shipping not taxable for this location
- `FixedRate`: use `Rate` (percentage)
- `Proportional`: centralized proportional shipping tax should be used
- `ProviderCalculated`: provider needs full order context to determine shipping tax

References:
- `src/Merchello.Core/Tax/Providers/Models/ShippingTaxConfigurationResult.cs`
- `src/Merchello.Core/Tax/Providers/Models/ShippingTaxMode.cs`

## 3. Implementation Pattern For New Providers

### 3.1 Start from TaxProviderBase

`TaxProviderBase` gives:
- configuration storage (`Configuration`)
- typed config helpers (`GetConfigValue`, `GetConfigBool`, `GetConfigInt`, `GetRequiredConfigValue`)
- tax group mapping helper (`GetTaxCodeForTaxGroup`) using config key `taxGroupMappings`
- shipping tax code helper (`GetShippingTaxCode`) using config key `shippingTaxCode`

Reference: `src/Merchello.Core/Tax/Providers/TaxProviderBase.cs`

### 3.2 Minimal skeleton (current signature)

```csharp
public class MyTaxProvider : TaxProviderBase
{
    public override TaxProviderMetadata Metadata => new(
        Alias: "my-provider",
        DisplayName: "My Provider",
        Icon: "icon-calculator",
        Description: "Custom tax provider",
        SupportsRealTimeCalculation: true,
        RequiresApiCredentials: true);

    public override ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
        [
            new ProviderConfigurationField
            {
                Key = "apiKey",
                Label = "API Key",
                FieldType = ConfigurationFieldType.Password,
                IsSensitive = true,
                IsRequired = true
            },
            new ProviderConfigurationField
            {
                Key = "taxGroupMappings",
                Label = "Tax Group Mappings",
                FieldType = ConfigurationFieldType.TaxGroupMapping,
                IsRequired = false
            }
        ]);
    }

    public override Task<TaxCalculationResult> CalculateOrderTaxAsync(
        TaxCalculationRequest request,
        CancellationToken cancellationToken = default)
    {
        // Implement provider call and map to TaxCalculationResult.
        throw new NotImplementedException();
    }

    public override Task<ShippingTaxConfigurationResult> GetShippingTaxConfigurationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default)
    {
        // Return ProviderCalculated for APIs that need full cart context.
        return Task.FromResult(ShippingTaxConfigurationResult.ProviderCalculated());
    }
}
```

### 3.3 Do not duplicate business math

Always keep centralized math in the centralized services when provider tax is not authoritative:
- basket totals: `CheckoutService.CalculateBasketAsync()`
- proportional shipping tax: `ITaxCalculationService.CalculateProportionalShippingTax()`
- shipping tax config retrieval: `ITaxProviderManager.GetShippingTaxConfigurationAsync()`

## 4. Manual Provider Behavior (Built-in reference)

`ManualTaxProvider` behavior summary:
- line-item tax from `ITaxService.GetApplicableRateAsync(taxGroupId, country, state)`
- shipping tax priority:
1. regional override (`ShippingTaxOverride`) if present
2. config `isShippingTaxable` + `shippingTaxGroupId`
3. proportional mode if taxable and no fixed group configured
4. not taxed

Reference: `src/Merchello.Core/Tax/Providers/BuiltIn/ManualTaxProvider.cs`

## 5. Avalara Provider Behavior (Built-in reference)

### 5.1 Configuration keys (actual)

- `accountId` (required, numeric)
- `licenseKey` (required, sensitive)
- `companyCode` (required)
- `environment` (`sandbox` or `production`)
- `enableLogging` (optional)
- `taxGroupMappings` (optional)
- `shippingTaxCode` (optional, default `FR020100`)

Reference: `src/Merchello.Core/Tax/Providers/BuiltIn/AvalaraTaxProvider.cs`

### 5.2 Calculation mapping

- Uses `DocumentType.SalesOrder` when `request.IsEstimate = true`
- Uses `DocumentType.SalesInvoice` when `request.IsEstimate = false`
- Maps product tax code precedence:
1. `GetTaxCodeForTaxGroup(item.TaxGroupId)`
2. `item.TaxCode`
3. default `P0000000`
- Non-taxable line items force tax code `NT`
- Shipping is sent as separate line with tax code from `shippingTaxCode` or fallback `FR020100`
- Response mapping preserves line correlation with `LineItemId` and SKU fallback

### 5.3 Shipping tax mode for Avalara

Avalara provider does not override shipping mode API; it inherits base behavior:
- `GetShippingTaxConfigurationAsync()` => `ProviderCalculated`

That is correct for full-context APIs like Avalara.

### 5.4 Avalara provider completeness assessment

Current status in this repo:
- Complete for current Merchello tax provider contract.
- Good reference for external API provider structure.
- Has unit coverage for metadata, config, and non-configured behavior.

Known boundaries:
- Authoritative calls use `CreateOrAdjustTransactionAsync` when a deterministic `ReferenceNumber` is provided.
- If no reference is provided, provider falls back to `CreateTransactionAsync` (non-idempotent server create semantics).
- Live credential integration tests are available but opt-in via environment variables.
- Relies on Avalara company configuration for origin behavior (ship-to is provided directly).

Test references:
- `src/Merchello.Tests/Tax/Providers/AvalaraTaxProviderTests.cs`
- `src/Merchello.Tests/Tax/Providers/AvalaraLiveFactAttribute.cs`
- `src/Merchello.Tests/Tax/Providers/AvalaraTaxProviderLiveIntegrationTests.cs`
- `src/Merchello.Tests/Tax/TaxPipelineOrchestrationIntegrationTests.cs`

## 6. Security and Config Storage

Tax provider settings are protected at rest via `IProviderSettingsProtector`.
In web runtime, this is `DataProtectionProviderSettingsProtector`.

Backoffice handling:
- sensitive fields are masked in responses (`********`)
- saving masked value preserves existing secret

References:
- `src/Merchello.Core/Tax/Providers/Interfaces/IProviderSettingsProtector.cs`
- `src/Merchello/Tax/Services/DataProtectionProviderSettingsProtector.cs`
- `src/Merchello/Controllers/TaxProvidersApiController.cs`
- `src/Merchello.Tests/Tax/Providers/TaxProvidersApiControllerSecurityTests.cs`
- `src/Merchello.Tests/Tax/Providers/TaxProviderManagerSecurityTests.cs`

## 7. Avalara SDK/API Currency Check (2026-02-20)

Repository currently uses:
- `Avalara.AvaTax` package `26.2.0`
- reference location: `src/Merchello.Core/Merchello.Core.csproj`

External verification:
- NuGet latest `Avalara.AvaTax` version is `26.2.0` (published 2026-02-09)
- AvaTax REST root reports API version `26.2.2`
- Swagger security definition confirms Basic auth supports both:
- `Username/Password`
- `AccountId/LicenseKey`

Verification links:
- https://www.nuget.org/packages/Avalara.AvaTax
- https://api.nuget.org/v3-flatcontainer/avalara.avatax/index.json
- https://rest.avatax.com/
- https://rest.avatax.com/swagger/v2/swagger.json

## 8. Checklist For New Provider PRs

1. Contract correctness
- Implements exact `ITaxProvider` signatures.
- Returns `ShippingTaxConfigurationResult` modes correctly.

2. Mapping correctness
- Uses `LineItemId` in line results when possible.
- Handles tax-exempt request path explicitly.

3. Configuration
- Declares `ProviderConfigurationField` entries with proper `IsSensitive` flags.
- Uses `taxGroupMappings` and `shippingTaxCode` consistently.

4. Failure semantics
- Returns `TaxCalculationResult.Failed("...")` with actionable message.
- Avoids throwing for recoverable provider/API errors.

5. Tests
- Unit tests for metadata, config fields, not-configured behavior, success mapping, failure mapping.
- Integration test using deterministic provider style if live API tests are unavailable.

6. Documentation
- Add provider-specific config keys and tax code mapping details.
- Include shipping tax mode behavior and estimation expectations.
