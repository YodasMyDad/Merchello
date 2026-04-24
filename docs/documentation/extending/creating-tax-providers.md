# Creating Custom Tax Providers

Tax providers calculate tax for orders during checkout and when invoices are created. Merchello includes a built-in manual tax provider and an Avalara integration, but you can create your own for services like TaxJar, Vertex, or custom tax logic.

## Quick Overview

To create a tax provider, you need to:

1. Create a class that extends `TaxProviderBase`
2. Implement `Metadata` and `CalculateOrderTaxAsync()`
3. Optionally implement configuration validation and shipping tax configuration

## Minimal Example

```csharp
using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Providers.Models;
using Merchello.Core.Shared.Providers;

public class AcmeTaxProvider : TaxProviderBase
{
    public override TaxProviderMetadata Metadata => new(
        Alias: "acme-tax",
        DisplayName: "Acme Tax Service",
        Icon: "icon-coin",
        Description: "Real-time tax calculation via Acme",
        SupportsRealTimeCalculation: true,
        RequiresApiCredentials: true,
        SetupInstructions: "Enter your Acme Tax API key to get started."
    );

    public override async Task<TaxCalculationResult> CalculateOrderTaxAsync(
        TaxCalculationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.IsTaxExempt)
            return TaxCalculationResult.ZeroTax(request.LineItems);

        // Call your tax API
        var apiKey = GetRequiredConfigValue("apiKey");
        // ... call external API ...

        var lineResults = request.LineItems.Select(li => new LineTaxResult
        {
            LineItemId = li.LineItemId,
            Sku = li.Sku,
            TaxRate = 0.08m,  // 8%
            TaxAmount = li.Amount * 0.08m,
            IsTaxable = li.IsTaxable
        }).ToList();

        return TaxCalculationResult.Successful(
            totalTax: lineResults.Sum(lr => lr.TaxAmount),
            lineResults: lineResults,
            shippingTax: request.ShippingAmount * 0.08m
        );
    }
}
```

## Step-by-Step Breakdown

### Step 1: Define Metadata

```csharp
public override TaxProviderMetadata Metadata => new(
    Alias: "my-tax",                        // Required. Unique, immutable identifier.
    DisplayName: "My Tax Service",           // Required. Shown in backoffice.
    Icon: "icon-coin",                       // Optional. Umbraco icon class.
    Description: "...",                      // Optional.
    SupportsRealTimeCalculation: true,       // Does this call an external API?
    RequiresApiCredentials: true,            // Does it need API keys?
    SetupInstructions: "## Setup\n...",      // Optional. Markdown.
    IconSvg: "<svg>...</svg>"                // Optional. Custom SVG.
);
```

### Step 2: Configuration Fields

```csharp
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
            IsRequired = true,
            IsSensitive = true
        },
        new ProviderConfigurationField
        {
            Key = "companyCode",
            Label = "Company Code",
            FieldType = ConfigurationFieldType.Text,
            IsRequired = false,
            Description = "Your company code for multi-entity setups"
        },
        new ProviderConfigurationField
        {
            Key = "taxGroupMappings",
            Label = "Tax Group Mappings",
            FieldType = ConfigurationFieldType.TaxGroupMapping,
            IsRequired = false,
            Description = "Map Merchello tax groups to provider-specific tax codes"
        }
    ]);
}
```

> **Tip:** The `TaxGroupMapping` field type renders a special UI in the backoffice that shows all your tax groups with text inputs for entering provider-specific tax codes (e.g., Avalara tax codes).

### Step 3: Access Configuration

The base class provides helper methods for reading configuration values:

```csharp
// Get a string value (returns null if missing)
var apiKey = GetConfigValue("apiKey");

// Get a required value (throws InvalidOperationException if missing)
var requiredKey = GetRequiredConfigValue("apiKey");

// Get typed values with defaults
var enabled = GetConfigBool("enabled", defaultValue: true);
var retries = GetConfigInt("maxRetries", defaultValue: 3);

// Get the mapped tax code for a Merchello TaxGroup
var taxCode = GetTaxCodeForTaxGroup(lineItem.TaxGroupId);

// Get the shipping tax code
var shippingTaxCode = GetShippingTaxCode();
```

### Step 4: Calculate Order Tax

This is the core method. It receives a `TaxCalculationRequest` with everything you need:

```csharp
public override async Task<TaxCalculationResult> CalculateOrderTaxAsync(
    TaxCalculationRequest request,
    CancellationToken cancellationToken = default)
{
    // Handle tax-exempt transactions
    if (request.IsTaxExempt)
        return TaxCalculationResult.ZeroTax(request.LineItems);

    // Build your API request
    // Available data:
    //   request.ShippingAddress     - destination address (country, state, postal, etc.)
    //   request.BillingAddress      - origin address (optional)
    //   request.CurrencyCode        - e.g., "USD", "GBP"
    //   request.LineItems           - products with amounts, SKUs, TaxGroupIds
    //   request.ShippingAmount      - shipping cost to potentially tax
    //   request.CustomerId          - for customer-specific exemptions
    //   request.TaxExemptionNumber  - exemption certificate number
    //   request.IsEstimate          - true for checkout preview, false for final order
    //   request.TransactionDate     - for historical rate lookups
    //   request.ReferenceNumber     - order reference for provider tracking

    var lineResults = new List<LineTaxResult>();
    decimal totalTax = 0;

    foreach (var lineItem in request.LineItems)
    {
        if (!lineItem.IsTaxable)
        {
            lineResults.Add(new LineTaxResult
            {
                LineItemId = lineItem.LineItemId,
                Sku = lineItem.Sku,
                TaxRate = 0,
                TaxAmount = 0,
                IsTaxable = false
            });
            continue;
        }

        // Look up tax code from TaxGroup mapping
        var taxCode = GetTaxCodeForTaxGroup(lineItem.TaxGroupId);

        // Calculate tax (replace with your API call)
        var rate = await LookUpRate(
            request.ShippingAddress.CountryCode,
            request.ShippingAddress.CountyState?.RegionCode,
            taxCode,
            cancellationToken);

        var taxAmount = lineItem.Amount * rate;
        totalTax += taxAmount;

        lineResults.Add(new LineTaxResult
        {
            LineItemId = lineItem.LineItemId,
            Sku = lineItem.Sku,
            TaxRate = rate,
            TaxAmount = taxAmount,
            IsTaxable = true,
            TaxCode = taxCode  // Provider-specific tax code used
        });
    }

    // Calculate shipping tax
    var shippingTax = request.ShippingAmount > 0
        ? await CalculateShippingTax(request, cancellationToken)
        : 0;

    return TaxCalculationResult.Successful(
        totalTax: totalTax + shippingTax,
        lineResults: lineResults,
        shippingTax: shippingTax,
        transactionId: "txn_abc123",  // Provider's transaction ID for audit
        isEstimated: request.IsEstimate
    );
}
```

### Step 5: Validate Configuration

Override to test API credentials when an admin saves settings:

```csharp
public override async Task<TaxProviderValidationResult> ValidateConfigurationAsync(
    CancellationToken cancellationToken = default)
{
    try
    {
        var apiKey = GetRequiredConfigValue("apiKey");

        // Make a test API call
        var testResult = await TestApiConnection(apiKey, cancellationToken);
        if (!testResult.Success)
            return TaxProviderValidationResult.Invalid(testResult.ErrorMessage);

        return TaxProviderValidationResult.Valid();
    }
    catch (Exception ex)
    {
        return TaxProviderValidationResult.Invalid(ex.Message);
    }
}
```

### Step 6: Shipping Tax Configuration

This method tells the tax orchestration service how shipping should be taxed for a given location:

```csharp
public override Task<ShippingTaxConfigurationResult> GetShippingTaxConfigurationAsync(
    string countryCode,
    string? stateCode,
    CancellationToken cancellationToken = default)
{
    // Return how shipping tax should be calculated for this location.
    // Options:

    // Shipping is not taxed in this jurisdiction
    // return Task.FromResult(ShippingTaxConfigurationResult.NotTaxed());

    // Apply a fixed rate to shipping
    // return Task.FromResult(ShippingTaxConfigurationResult.FixedRate(0.08m));

    // Use proportional calculation (weighted average of product tax rates)
    // return Task.FromResult(ShippingTaxConfigurationResult.Proportional());

    // Provider will calculate shipping tax itself (default)
    return Task.FromResult(ShippingTaxConfigurationResult.ProviderCalculated());
}
```

> **Warning:** Never hardcode shipping tax rates. Always use `GetShippingTaxConfigurationAsync()` so the tax orchestration service can apply the correct method for each jurisdiction.

**Shipping tax modes explained:**

| Mode | When to use |
|---|---|
| `NotTaxed` | Jurisdiction explicitly does not tax shipping |
| `FixedRate` | Jurisdiction has a known, fixed tax rate for shipping |
| `Proportional` | Shipping tax is a weighted average of product tax rates (the system handles the math via `ITaxCalculationService.CalculateProportionalShippingTax()`) |
| `ProviderCalculated` | Your provider calculates shipping tax as part of `CalculateOrderTaxAsync()` |

## TaxGroup Mappings

Merchello uses TaxGroups to categorize products (e.g., "Standard Rate", "Reduced Rate", "Zero Rate"). Your provider maps these to provider-specific tax codes:

```csharp
// In CalculateOrderTaxAsync, for each line item:
var providerTaxCode = GetTaxCodeForTaxGroup(lineItem.TaxGroupId);
// Returns the mapped code from the TaxGroupMapping config field
// e.g., TaxGroupId "clothing" -> Avalara code "PC040100"
```

This mapping is configured by the store admin in the backoffice using the `TaxGroupMapping` field type.

> **Warning:** `TaxGroupId` must flow through unchanged from `ProductRoot` into the order line items and into the tax payload you send to the provider. Do not mutate or re-derive it in the provider -- external services rely on the canonical mapping for tax-code selection.

## Tax Orchestration Boundary

Tax calculation is coordinated by `ITaxOrchestrationService` (which is itself invoked from `CheckoutService.CalculateBasketAsync()` and the invoice tax recalculation path). Do not call tax providers directly from controllers or views -- always go through the orchestration / checkout services. Your provider is a plug-in to that pipeline, not an entry point.

## Dependency Injection

> **Warning:** Use **constructor injection only**. `ExtensionManager` activates tax providers via `ActivatorUtilities.CreateInstance`; setter injection and post-construction configuration hooks are not supported. See [Extension Manager](extension-manager.md).

## Built-in Providers for Reference

| Provider | Location | Notes |
|---|---|---|
| Manual Tax | [ManualTaxProvider.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Tax/Providers/BuiltIn/ManualTaxProvider.cs) | Uses manually configured rates per country/region |
| Avalara | [AvalaraTaxProvider.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Tax/Providers/BuiltIn/AvalaraTaxProvider.cs) | Real-time tax calculation via AvaTax API |

Base class: [TaxProviderBase.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Tax/Providers/TaxProviderBase.cs). Interface: [ITaxProvider.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Tax/Providers/Interfaces/ITaxProvider.cs).
