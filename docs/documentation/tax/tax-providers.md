# Tax Providers

Merchello uses a pluggable provider system for tax calculation. Out of the box, you get two providers: **Manual Tax Rates** for simple setups and **Avalara AvaTax** for automated, real-time tax calculation. Only one provider can be active at a time.

## Provider Architecture

Tax providers are discovered automatically by Merchello's `ExtensionManager` during startup. Each provider:

1. Implements the `ITaxProvider` interface
2. Declares metadata (alias, display name, icon, description)
3. Defines configuration fields (API keys, settings)
4. Calculates tax for a given order context
5. Reports shipping tax configuration per location

The `TaxProviderManager` manages provider lifecycle:
- Discovers all registered providers
- Loads saved configuration (encrypted at rest)
- Maintains exactly one active provider
- Falls back to the Manual provider if none is explicitly activated

Provider activation and configuration is done through the Merchello backoffice under **Settings > Tax**.

---

## Built-in: Manual Tax Provider

**Alias:** `manual`

The Manual Tax Provider uses the Tax Groups and Tax Group Rates you configure in the backoffice. It is the default provider and requires no external API credentials.

### How it calculates

For each taxable line item:
1. Look up the applicable rate using `TaxService.GetApplicableRateAsync()` (state -> country -> default)
2. Calculate: `taxAmount = (unitPrice * quantity) * (rate / 100)`

For shipping tax, it follows the 4-tier priority system described in [Shipping Tax](shipping-tax.md).

### Configuration options

| Setting | Description |
|---------|-------------|
| `isShippingTaxable` | Whether shipping costs should be taxed (boolean) |
| `shippingTaxGroupId` | Tax group for shipping tax. Empty = use proportional rate |

> **Tip:** The Manual provider is ideal for businesses operating in a single country or a small number of jurisdictions. If you sell into many US states with varying tax rules, consider Avalara instead.

---

## Built-in: Avalara AvaTax

**Alias:** `avalara`

Avalara AvaTax provides real-time, jurisdiction-accurate tax calculation via their API. It automatically handles:
- US sales tax across all states, counties, and cities
- Canadian GST/HST/PST
- EU VAT
- Special tax rules for specific product types

### Configuration

All Avalara settings are configured in the backoffice:

| Setting | Description |
|---------|-------------|
| `accountId` | Your Avalara Account ID |
| `licenseKey` | Your Avalara License Key (stored encrypted) |
| `companyCode` | Company code from your Avalara account (e.g., "DEFAULT") |
| `environment` | `sandbox` for testing, `production` for live |
| `enableLogging` | Log all API calls for debugging |

### Tax code mapping

Avalara uses product-specific tax codes to determine the correct tax treatment. Merchello maps Tax Groups to Avalara tax codes through the `taxGroupMappings` configuration:

```json
{
  "taxGroupMappings": {
    "guid-of-standard-rate": "P0000000",
    "guid-of-clothing": "PC040100",
    "guid-of-food": "PF050001"
  }
}
```

Default tax codes used by the Avalara provider:
- General tangible goods: `P0000000`
- Shipping/freight: `FR020100`
- Non-taxable: `NT`

### Shipping tax with Avalara

The Avalara provider returns `ProviderCalculated` for shipping tax configuration. This means Avalara determines shipping taxability from the full order context -- you don't need to configure shipping tax overrides separately.

### Fallback behavior

If the Avalara API fails:
- **During checkout** (`AllowEstimate = true`): Falls back to centralized estimate using Manual provider rates
- **During invoice editing** (`AllowEstimate = false`): Fails closed (no estimate, returns error)

This ensures invoices always have accurate tax calculations, while checkout remains resilient to temporary API issues.

---

## Single Provider Constraint

Only one tax provider can be active at a time. When you activate a provider, any previously active provider is automatically deactivated. This is by design -- mixing tax calculation sources would lead to inconsistent results.

Provider activation is managed through the backoffice.

---

## Tax Pipeline Flow

Understanding the full flow helps when building or debugging providers:

1. `CheckoutService.CalculateBasketAsync()` builds `TaxableLineItem` inputs
2. `ITaxOrchestrationService.CalculateAsync()` resolves the active provider
3. If provider is `manual`, orchestration uses the centralized calculation path
4. If provider is external, orchestration calls `provider.CalculateOrderTaxAsync()`
5. On success: authoritative line tax rates and totals from the provider are applied
6. On failure: fallback to estimate (checkout) or fail closed (invoice)

`ITaxOrchestrationService` is the developer entry point for tax calculations. Do not call tax providers directly from controllers -- always go through the orchestration or checkout services.

> **Warning:** Source line types sent to providers are `Product`, `Custom`, and `Addon` only. Discount line items are not sent directly to external providers.

---

## Building a Custom Tax Provider

To create your own tax provider (e.g., for TaxJar, Vertex, or a local tax authority API):

### 1. Create a class that extends `TaxProviderBase`

```csharp
public class MyTaxProvider : TaxProviderBase
{
    public override TaxProviderMetadata Metadata => new(
        Alias: "my-tax-provider",
        DisplayName: "My Tax Service",
        Icon: "icon-cloud",
        Description: "Tax calculation via My Tax Service API",
        SupportsRealTimeCalculation: true,
        RequiresApiCredentials: true,
        SetupInstructions: "Enter your API key from mytaxservice.com"
    );

    public override ValueTask<IEnumerable<ProviderConfigurationField>>
        GetConfigurationFieldsAsync(CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
        [
            new()
            {
                Key = "apiKey",
                Label = "API Key",
                FieldType = ConfigurationFieldType.Password,
                IsRequired = true,
                IsSensitive = true
            }
        ]);
    }

    public override async Task<TaxCalculationResult> CalculateOrderTaxAsync(
        TaxCalculationRequest request,
        CancellationToken ct = default)
    {
        if (request.IsTaxExempt)
        {
            return TaxCalculationResult.ZeroTax(request.LineItems);
        }

        var apiKey = GetRequiredConfigValue("apiKey");

        // Call your tax API...
        // Build LineTaxResult for each line item...

        return TaxCalculationResult.Successful(
            totalTax: calculatedTotal,
            lineResults: lineResults,
            shippingTax: shippingTaxAmount);
    }
}
```

### 2. Package and install

Package your provider as a NuGet package that references `Merchello.Core`. When the host application calls `builder.AddMerchello()`, your provider assembly is scanned and the provider appears in the backoffice for activation.

### 3. Key interfaces

| Method | Purpose |
|--------|---------|
| `CalculateOrderTaxAsync()` | Main calculation -- receives line items, shipping, addresses |
| `GetShippingTaxConfigurationAsync()` | Returns shipping tax mode for a location |
| `ValidateConfigurationAsync()` | Test API credentials (shown in backoffice) |
| `GetConfigurationFieldsAsync()` | Define settings UI for the backoffice |
| `ConfigureAsync()` | Receive saved settings at startup |

### Helper methods from `TaxProviderBase`

- `GetConfigValue(key)` -- get a configuration value
- `GetRequiredConfigValue(key)` -- get a required value (throws if missing)
- `GetConfigBool(key, default)` -- parse boolean config
- `GetTaxCodeForTaxGroup(taxGroupId)` -- look up provider-specific tax code mapping
- `GetShippingTaxCode()` -- get configured shipping tax code

> **Warning:** Sensitive configuration values (API keys, secrets) are automatically encrypted at rest by `IProviderSettingsProtector`. Mark sensitive fields with `IsSensitive = true` in your configuration field definitions.

For more on creating tax providers, see [Creating Tax Providers](../extending/creating-tax-providers.md).
