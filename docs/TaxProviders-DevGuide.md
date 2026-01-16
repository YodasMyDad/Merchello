# Tax Provider Development Guide

Guide for third-party developers creating custom tax providers.

> **Note:** Merchello includes built-in tax providers:
> - **Manual Tax Provider** - Uses TaxGroup/TaxGroupRate for location-based manual rates
> - **Avalara AvaTax Provider** - Real-time tax calculation via Avalara's API (requires Avalara account)
>
> The examples in this guide demonstrate how to build custom integrations for other external tax services (TaxJar, Vertex, etc.).

## Quick Start

1. Create .NET Class Library project
2. Reference `Merchello.Core` NuGet package
3. Implement `ITaxProvider` or extend `TaxProviderBase`
4. Package as NuGet
5. Install - Merchello auto-discovers via assembly scanning

## Key Concepts

### Single Active Provider

Unlike shipping (multiple providers per order) and payment (customer choice), tax calculation uses a **single active provider** store-wide. This ensures consistent tax calculation across all transactions.

```
Product.TaxGroupId → TaxGroup (category)
                          ↓
                   Active Tax Provider
                          ↓
         ┌────────────────┴────────────────┐
         │                                 │
   Manual Provider                  Avalara Provider
   (uses TaxGroupRates)            (API call with tax code)
         │                                 │
         └────────────────┬────────────────┘
                          ↓
                    Tax Rate %
```

### TaxGroups = Tax Categories

TaxGroups are **categories**, not rate containers:
- "Standard Rate" → Avalara tax code `P0000000` (general tangible goods)
- "Reduced Rate" → Avalara tax code `PF050001` (food)
- "Zero Rate" → Avalara tax code `NT` (non-taxable)

The **provider** determines the actual rate based on:
1. Tax category (TaxGroup)
2. Shipping address (country, state, city, zip)
3. Provider-specific logic (manual lookup OR API call)

### Provider Capabilities

| Capability | Description | Example Use Case |
|------------|-------------|------------------|
| `SupportsRealTimeCalculation` | Fetches live rates from tax API | Avalara, TaxJar |
| `RequiresApiCredentials` | Needs API keys/secrets | External providers |

---

## Interface

```csharp
public interface ITaxProvider
{
    /// <summary>Provider metadata (alias, name, capabilities)</summary>
    TaxProviderMetadata Metadata { get; }

    /// <summary>Configuration fields for admin UI</summary>
    ValueTask<IEnumerable<TaxProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>Configure provider with saved settings</summary>
    ValueTask ConfigureAsync(
        TaxProviderConfiguration? configuration,
        CancellationToken cancellationToken = default);

    /// <summary>Calculate complete order tax including line items AND shipping</summary>
    Task<TaxCalculationResult> CalculateOrderTaxAsync(
        TaxCalculationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>Validate configuration (test API credentials)</summary>
    Task<TaxProviderValidationResult> ValidateConfigurationAsync(
        CancellationToken cancellationToken = default);

    /// <summary>Get shipping tax rate for a location (for display purposes)</summary>
    /// <returns>Tax rate percentage (e.g., 20 for 20%), or null if rate requires full calculation</returns>
    Task<decimal?> GetShippingTaxRateForLocationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default);
}
```

**Note on `GetShippingTaxRateForLocationAsync`:** This method supports tax-inclusive display pricing. Providers that can determine shipping tax rate statically (like ManualTaxProvider) should return the rate. API-based providers (like Avalara) that require a full calculation should return `null`.

---

## Models

### TaxProviderMetadata

```csharp
public record TaxProviderMetadata(
    string Alias,                      // Unique identifier (e.g., "avalara")
    string DisplayName,                // Shown in UI (e.g., "Avalara AvaTax")
    string? Icon,                      // Umbraco icon name
    string? Description,               // Provider description
    bool SupportsRealTimeCalculation,  // true for API-based providers
    bool RequiresApiCredentials,       // true if API keys needed
    string? SetupInstructions = null); // Help text for configuration
```

### TaxCalculationRequest

```csharp
public class TaxCalculationRequest
{
    public required Address ShippingAddress { get; init; }  // For destination-based tax
    public Address? BillingAddress { get; init; }           // For origin-based (some jurisdictions)
    public required string CurrencyCode { get; init; }
    public required List<TaxableLineItem> LineItems { get; init; }
    public decimal ShippingAmount { get; init; }            // May be taxable
    public Guid? CustomerId { get; init; }                  // For exemptions
    public string? CustomerEmail { get; init; }
    public string? TaxExemptionNumber { get; init; }
    public bool IsTaxExempt { get; init; }
    public DateTime? TransactionDate { get; init; }
    public string? ReferenceNumber { get; init; }           // Order/invoice reference
    public Dictionary<string, string>? ExtendedData { get; init; }
}
```

### TaxableLineItem

```csharp
public class TaxableLineItem
{
    public required string Sku { get; init; }
    public required string Name { get; init; }
    public required decimal Amount { get; init; }      // Unit price
    public required int Quantity { get; init; }
    public Guid? TaxGroupId { get; init; }             // Tax category
    public string? TaxCode { get; init; }              // Provider-specific (e.g., Avalara code)
    public bool IsTaxable { get; init; } = true;
    public Dictionary<string, string>? ExtendedData { get; init; }
}
```

### TaxCalculationResult

```csharp
public class TaxCalculationResult
{
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public decimal TotalTax { get; init; }
    public decimal ShippingTax { get; init; }
    public List<LineTaxResult> LineResults { get; init; } = [];
    public string? TransactionId { get; init; }        // Provider reference for audit

    // Factory methods
    public static TaxCalculationResult Successful(
        decimal totalTax, List<LineTaxResult> lineResults,
        decimal shippingTax = 0, string? transactionId = null);
    public static TaxCalculationResult Failed(string errorMessage);
    public static TaxCalculationResult ZeroTax(List<TaxableLineItem> lineItems);
}
```

### LineTaxResult

```csharp
public class LineTaxResult
{
    public required string Sku { get; init; }
    public decimal TaxRate { get; init; }              // Percentage (0-100)
    public decimal TaxAmount { get; init; }
    public bool IsTaxable { get; init; } = true;
    public string? TaxJurisdiction { get; init; }      // e.g., "US-CA"
    public Dictionary<string, string>? ExtendedData { get; init; }
}
```

### Configuration Field Types

| Type | Use For |
|------|---------|
| `Text` | API keys, account IDs |
| `Password` | Secrets (masked in UI) |
| `Textarea` | Multi-line config |
| `Checkbox` | Boolean flags |
| `Select` | Dropdown options |
| `Url` | Endpoint URLs |
| `Number` | Integer values |
| `Currency` | Currency/decimal input with formatting |
| `Percentage` | Percentage input (0-100) |

---

## Example 1: Manual Tax Provider (Built-in)

The built-in provider wraps the existing TaxGroup/TaxGroupRate system. It supports shipping tax via regional overrides or proportional (weighted average) calculation for EU/UK compliance.

```csharp
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
                Description = "Enable tax on shipping costs. Regional overrides take precedence."
            },
            new()
            {
                Key = "shippingTaxGroupId",
                Label = "Shipping Tax Group",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                Description = "Tax group for shipping. Leave empty for proportional rate (weighted average)."
            }
        ]);
    }

    public override async Task<TaxCalculationResult> CalculateOrderTaxAsync(
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
            return TaxCalculationResult.Failed(
                "Shipping address with country code is required for tax calculation.");
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

        // Calculate shipping tax (4-tier priority: regional override → configured group → proportional → none)
        decimal shippingTax = 0;
        if (request.ShippingAmount > 0 && GetConfigBool("isShippingTaxable", false))
        {
            shippingTax = CalculateProportionalShippingTax(request, lineResults);
        }

        return TaxCalculationResult.Successful(
            totalTax: lineResults.Sum(r => r.TaxAmount) + shippingTax,
            lineResults: lineResults,
            shippingTax: shippingTax
        );
    }

    /// <summary>
    /// Calculates shipping tax using proportional/weighted average (EU/UK compliant).
    /// </summary>
    private decimal CalculateProportionalShippingTax(
        TaxCalculationRequest request,
        List<LineTaxResult> lineResults)
    {
        var taxableSubtotal = request.LineItems
            .Where(li => li.IsTaxable && li.TaxGroupId.HasValue)
            .Sum(li => li.Amount * li.Quantity);

        var lineItemTax = lineResults.Sum(r => r.TaxAmount);

        return taxCalculationService.CalculateProportionalShippingTax(
            request.ShippingAmount, lineItemTax, taxableSubtotal, request.CurrencyCode);
    }
}
```

> **Note:** The actual implementation includes additional features like regional shipping tax overrides and `GetShippingTaxRateForLocationAsync()` for tax-inclusive display pricing. See the source code at `src/Merchello.Core/Tax/Providers/BuiltIn/ManualTaxProvider.cs` for the complete implementation.

---

## Example 2: Avalara AvaTax Provider (Built-in)

> **Note:** Avalara AvaTax is now a built-in provider in Merchello. The source code can be found at:
> `src/Merchello.Core/Tax/Providers/BuiltIn/AvalaraTaxProvider.cs`

The built-in Avalara provider offers:
- **Configuration Fields:** Account ID, License Key (sensitive), Company Code, Environment (Sandbox/Production), Enable Logging
- **Tax Calculation:** Uses `DocumentType.SalesOrder` for non-recording tax estimates
- **Shipping Tax:** Automatically adds shipping as a taxable line item with tax code `FR020100`
- **Tax Codes:** Uses `P0000000` (general tangible goods) as default; supports custom tax codes via `TaxableLineItem.TaxCode`

### Configuration

| Field | Type | Description |
|-------|------|-------------|
| `accountId` | Text | Avalara Account ID from Admin Console |
| `licenseKey` | Password | Avalara License Key (API key) |
| `companyCode` | Text | Company code (default: "DEFAULT") |
| `environment` | Select | Sandbox (testing) or Production (live) |
| `enableLogging` | Checkbox | Enable API call logging for debugging |

### Usage

1. Get Avalara credentials from [avalara.com/developer](https://developer.avalara.com)
2. In Merchello backoffice, navigate to **Providers > Tax**
3. Select **Avalara AvaTax** and enter your credentials
4. Use **Sandbox** environment for testing
5. Click **Test** to validate your configuration
6. Set as active provider

### Tax Code Mapping

Products use `TaxableLineItem.TaxCode` if provided, otherwise the default `P0000000` (general tangible goods).

Common Avalara tax codes:
- `P0000000` - General tangible goods
- `PF050001` - Food/groceries
- `NT` - Non-taxable
- `FR020100` - Shipping/freight

---

## Example 3: TaxJar Provider

```csharp
public class TaxJarProvider : TaxProviderBase
{
    private TaxjarApi? _client;

    public override TaxProviderMetadata Metadata => new(
        Alias: "taxjar",
        DisplayName: "TaxJar",
        Icon: "icon-globe",
        Description: "Sales tax compliance with TaxJar",
        SupportsRealTimeCalculation: true,
        RequiresApiCredentials: true,
        SetupInstructions: "Get your API token from app.taxjar.com/account"
    );

    public override ValueTask<IEnumerable<TaxProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<TaxProviderConfigurationField>>(
        [
            new() {
                Key = "apiToken",
                Label = "API Token",
                FieldType = ConfigurationFieldType.Password,
                IsSensitive = true,
                IsRequired = true
            },
            new() {
                Key = "fromCountry",
                Label = "Ship From Country",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                DefaultValue = "US"
            },
            new() {
                Key = "fromState",
                Label = "Ship From State/Province",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true
            },
            new() {
                Key = "fromZip",
                Label = "Ship From ZIP/Postal Code",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true
            }
        ]);
    }

    public override async Task<TaxCalculationResult> CalculateOrderTaxAsync(
        TaxCalculationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_client == null)
        {
            return TaxCalculationResult.Failed("TaxJar provider not configured");
        }

        if (request.IsTaxExempt)
        {
            return TaxCalculationResult.ZeroTax(request.LineItems);
        }

        try
        {
            var orderItems = request.LineItems.Select(item => new
            {
                id = item.Sku,
                quantity = item.Quantity,
                product_tax_code = item.TaxCode ?? GetTaxJarCode(item.TaxGroupId),
                unit_price = item.Amount
            }).ToList();

            var response = await _client.TaxForOrderAsync(new
            {
                to_country = request.ShippingAddress.CountryCode,
                to_zip = request.ShippingAddress.PostalCode,
                to_state = request.ShippingAddress.CountyState?.RegionCode,
                to_city = request.ShippingAddress.CityTown,
                from_country = GetConfigValue("fromCountry"),
                from_zip = GetConfigValue("fromZip"),
                from_state = GetConfigValue("fromState"),
                amount = request.LineItems.Sum(li => li.Amount * li.Quantity),
                shipping = request.ShippingAmount,
                line_items = orderItems
            });

            var lineResults = request.LineItems.Select(item => new LineTaxResult
            {
                Sku = item.Sku,
                TaxRate = response.Rate * 100,
                TaxAmount = item.Amount * item.Quantity * response.Rate,
                IsTaxable = response.Rate > 0,
                TaxJurisdiction = $"{request.ShippingAddress.CountryCode}-{request.ShippingAddress.CountyState?.RegionCode}"
            }).ToList();

            return TaxCalculationResult.Successful(
                totalTax: response.AmountToCollect,
                lineResults: lineResults,
                shippingTax: response.Shipping?.TaxCollectable ?? 0
            );
        }
        catch (Exception ex)
        {
            return TaxCalculationResult.Failed($"TaxJar error: {ex.Message}");
        }
    }

    private string GetTaxJarCode(Guid? taxGroupId)
    {
        // TaxJar product tax codes
        // https://developers.taxjar.com/api/reference/#product-tax-codes
        return ""; // Empty = general taxable goods
    }
}
```

---

## Example 4: EU VAT Provider (VIES Validation)

For EU businesses with VAT-exempt B2B sales.

```csharp
public class EuVatProvider : TaxProviderBase
{
    private readonly HttpClient _httpClient;

    public override TaxProviderMetadata Metadata => new(
        Alias: "eu-vat",
        DisplayName: "EU VAT",
        Icon: "icon-flag-alt",
        Description: "EU VAT with VIES validation for B2B exemptions",
        SupportsRealTimeCalculation: true,
        RequiresApiCredentials: false,
        SetupInstructions: "Configure default VAT rates per country. B2B customers with valid VAT numbers are exempt."
    );

    public override ValueTask<IEnumerable<TaxProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<TaxProviderConfigurationField>>(
        [
            new() {
                Key = "sellerCountry",
                Label = "Seller Country Code",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                DefaultValue = "GB",
                Description = "Your business country (ISO 2-letter code)"
            },
            new() {
                Key = "defaultVatRate",
                Label = "Default VAT Rate %",
                FieldType = ConfigurationFieldType.Number,
                IsRequired = true,
                DefaultValue = "20"
            },
            new() {
                Key = "validateVatNumbers",
                Label = "Validate VAT Numbers via VIES",
                FieldType = ConfigurationFieldType.Checkbox,
                DefaultValue = "true"
            }
        ]);
    }

    public override async Task<TaxCalculationResult> CalculateOrderTaxAsync(
        TaxCalculationRequest request,
        CancellationToken cancellationToken = default)
    {
        var sellerCountry = GetConfigValue("sellerCountry") ?? "GB";
        var defaultRate = GetConfigInt("defaultVatRate", 20);
        var validateVat = GetConfigBool("validateVatNumbers", true);

        // Check for B2B VAT exemption
        bool isVatExempt = false;
        if (!string.IsNullOrEmpty(request.TaxExemptionNumber) && validateVat)
        {
            isVatExempt = await ValidateVatNumberAsync(
                request.TaxExemptionNumber,
                cancellationToken);
        }

        // Determine VAT rate based on destination
        var vatRate = isVatExempt ? 0m : DetermineVatRate(
            sellerCountry,
            request.ShippingAddress.CountryCode,
            defaultRate);

        var lineResults = request.LineItems.Select(item =>
        {
            var lineTotal = item.Amount * item.Quantity;
            var taxAmount = lineTotal * vatRate / 100;

            return new LineTaxResult
            {
                Sku = item.Sku,
                TaxRate = vatRate,
                TaxAmount = taxAmount,
                IsTaxable = vatRate > 0,
                TaxJurisdiction = request.ShippingAddress.CountryCode,
                ExtendedData = isVatExempt
                    ? new Dictionary<string, string> { ["vatExempt"] = "true" }
                    : null
            };
        }).ToList();

        return TaxCalculationResult.Successful(
            totalTax: lineResults.Sum(r => r.TaxAmount),
            lineResults: lineResults
        );
    }

    private decimal DetermineVatRate(string sellerCountry, string? buyerCountry, int defaultRate)
    {
        if (string.IsNullOrEmpty(buyerCountry))
            return defaultRate;

        // Simplified EU VAT rules
        // In production, you'd use destination country rates for digital goods, etc.
        if (IsEuCountry(buyerCountry) && !string.Equals(sellerCountry, buyerCountry, StringComparison.OrdinalIgnoreCase))
        {
            // B2B within EU (reverse charge) - handled by VAT exemption check
            // B2C within EU - use destination country rate (simplified here)
            return defaultRate;
        }

        // Same country or non-EU
        return IsEuCountry(buyerCountry) ? defaultRate : 0;
    }

    private async Task<bool> ValidateVatNumberAsync(string vatNumber, CancellationToken ct)
    {
        try
        {
            // VIES SOAP/REST validation
            // https://ec.europa.eu/taxation_customs/vies/
            var countryCode = vatNumber[..2];
            var number = vatNumber[2..];

            // Implementation would call VIES service
            // Return true if valid, false otherwise
            return await Task.FromResult(true); // Placeholder
        }
        catch
        {
            return false;
        }
    }

    private static bool IsEuCountry(string countryCode) =>
        new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
            "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
            "PL", "PT", "RO", "SK", "SI", "ES", "SE"
        }.Contains(countryCode);
}
```

---

## TaxProviderBase Helper Methods

The base class provides useful configuration helpers:

```csharp
public abstract class TaxProviderBase : ITaxProvider
{
    protected TaxProviderConfiguration? Configuration { get; private set; }

    // Get configuration value by key
    protected string? GetConfigValue(string key);

    // Get required configuration value (throws if missing)
    protected string GetRequiredConfigValue(string key);

    // Get boolean configuration value
    protected bool GetConfigBool(string key, bool defaultValue = false);

    // Get integer configuration value
    protected int GetConfigInt(string key, int defaultValue = 0);
}
```

---

## Testing Your Provider

### Configuration Validation

The backoffice includes a **Test** button for configured tax providers:

1. User clicks **Test** on a configured provider
2. System calls `ValidateConfigurationAsync()`
3. Shows success/failure with details

```csharp
public override async Task<TaxProviderValidationResult> ValidateConfigurationAsync(
    CancellationToken cancellationToken = default)
{
    try
    {
        // Test API connection
        var response = await _client.PingAsync();

        return TaxProviderValidationResult.Valid(new Dictionary<string, string>
        {
            ["apiVersion"] = response.Version,
            ["environment"] = response.Environment
        });
    }
    catch (Exception ex)
    {
        return TaxProviderValidationResult.Invalid($"Connection failed: {ex.Message}");
    }
}
```

### Unit Testing

```csharp
public class MyTaxProviderTests
{
    [Fact]
    public async Task CalculateOrderTaxAsync_WithValidAddress_ReturnsCorrectRate()
    {
        // Arrange
        var provider = new MyTaxProvider();
        await provider.ConfigureAsync(new TaxProviderConfiguration
        {
            // Configuration values
        });

        var request = new TaxCalculationRequest
        {
            ShippingAddress = new Address { CountryCode = "US", CountyState = new CountyState { RegionCode = "CA" } },
            CurrencyCode = "USD",
            LineItems =
            [
                new TaxableLineItem { Sku = "PROD-1", Name = "Widget", Amount = 100m, Quantity = 1 }
            ]
        };

        // Act
        var result = await provider.CalculateOrderTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalTax.ShouldBeGreaterThan(0);
        result.LineResults.ShouldHaveSingleItem();
    }

    [Fact]
    public async Task CalculateOrderTaxAsync_TaxExempt_ReturnsZeroTax()
    {
        // Arrange
        var provider = new MyTaxProvider();
        var request = new TaxCalculationRequest
        {
            IsTaxExempt = true,
            ShippingAddress = new Address { CountryCode = "US" },
            CurrencyCode = "USD",
            LineItems = [new TaxableLineItem { Sku = "PROD-1", Name = "Widget", Amount = 100m, Quantity = 1 }]
        };

        // Act
        var result = await provider.CalculateOrderTaxAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalTax.ShouldBe(0);
    }
}
```

---

## Tax Code Mapping

When using external providers, map TaxGroups to provider-specific tax codes:

### Option 1: ExtendedData on TaxGroup

```csharp
// When creating/editing TaxGroup
taxGroup.ExtendedData["AvalaraTaxCode"] = "P0000000";
taxGroup.ExtendedData["TaxJarCode"] = "31000";

// In provider
private async Task<string> GetProviderTaxCode(Guid? taxGroupId)
{
    if (!taxGroupId.HasValue) return DefaultTaxCode;

    var taxGroup = await _taxService.GetByIdAsync(taxGroupId.Value);
    return taxGroup?.ExtendedData?.GetValueOrDefault("AvalaraTaxCode") ?? DefaultTaxCode;
}
```

### Option 2: Configuration Mapping

```csharp
public override ValueTask<IEnumerable<TaxProviderConfigurationField>> GetConfigurationFieldsAsync(
    CancellationToken cancellationToken = default)
{
    return ValueTask.FromResult<IEnumerable<TaxProviderConfigurationField>>(
    [
        // ... API credentials ...
        new() {
            Key = "taxCodeMappings",
            Label = "Tax Code Mappings",
            FieldType = ConfigurationFieldType.Textarea,
            Description = "JSON mapping: {\"TaxGroupId\": \"TaxCode\", ...}"
        }
    ]);
}
```

---

## Frontend Integration

Tax providers are managed in the Merchello backoffice under **Providers > Tax**.

The storefront checkout uses the active provider automatically via `IInvoiceService`.

```typescript
// Checkout displays tax amount from invoice calculation
interface InvoiceDto {
  taxAmount: number;
  lineItems: LineItemDto[];
}

// Each line item includes its tax
interface LineItemDto {
  sku: string;
  amount: number;
  taxRate: number;
  taxAmount: number;
}
```

---

## Notes

- **Single active provider** - Only one provider handles all tax calculations
- **Sensitive config values** (API keys) should be encrypted at rest
- **Consider caching** - Real-time providers may cache rates for performance
- **Handle errors gracefully** - Return `TaxCalculationResult.Failed()` with clear messages
- **Providers auto-discovered** via assembly scanning - no DI registration needed
- **TaxGroups are categories** - Use `TaxCode` or `ExtendedData` for provider-specific mappings
- **Tax exemptions** - Check `IsTaxExempt` and `TaxExemptionNumber` on requests
- **Shipping tax** - Many jurisdictions tax shipping; use `ShippingAmount` in request
- **Test mode** - Use configuration to switch between sandbox/production environments
