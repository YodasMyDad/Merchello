using Avalara.AvaTax.RestClient;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Tax.Providers.Models;
using Merchello.Core.Shared.Providers;

namespace Merchello.Core.Tax.Providers.BuiltIn;

/// <summary>
/// Tax provider that uses Avalara AvaTax API for real-time tax calculation.
/// </summary>
public class AvalaraTaxProvider : TaxProviderBase
{
    private AvaTaxClient? _client;
    private string? _companyCode;

    /// <summary>
    /// Default tax code for general tangible goods.
    /// </summary>
    private const string DefaultTaxCode = "P0000000";

    /// <summary>
    /// Tax code for shipping/freight.
    /// </summary>
    private const string ShippingTaxCode = "FR020100";

    /// <summary>
    /// Avalara tax code for non-taxable goods/services.
    /// </summary>
    private const string NonTaxableTaxCode = "NT";

    /// <summary>
    /// Include line/detail payload so line mapping is deterministic.
    /// </summary>
    private const string TransactionResponseIncludes = "Lines,Details";
    private const string AuthoritativeAdjustmentDescription = "Merchello authoritative tax calculation";

    public override TaxProviderMetadata Metadata => new(
        Alias: "avalara",
        DisplayName: "Avalara AvaTax",
        Icon: "icon-cloud",
        Description: "Automatic sales tax calculation via Avalara AvaTax API",
        SupportsRealTimeCalculation: true,
        RequiresApiCredentials: true,
        SetupInstructions: "Get your Account ID and License Key from avalara.com/developer. " +
                          "Use Sandbox environment for testing before switching to Production.",
        IconSvg: ProviderBrandLogoCatalog.Avalara
    );

    public override ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
        [
            new ProviderConfigurationField
            {
                Key = "accountId",
                Label = "Account ID",
                Description = "Your Avalara Account ID (found in your Avalara Admin Console)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "2000000000"
            },
            new ProviderConfigurationField
            {
                Key = "licenseKey",
                Label = "License Key",
                Description = "Your Avalara License Key (API key for authentication)",
                FieldType = ConfigurationFieldType.Password,
                IsRequired = true,
                IsSensitive = true
            },
            new ProviderConfigurationField
            {
                Key = "companyCode",
                Label = "Company Code",
                Description = "The company code configured in your Avalara account (e.g., DEFAULT)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                DefaultValue = "DEFAULT",
                Placeholder = "DEFAULT"
            },
            new ProviderConfigurationField
            {
                Key = "environment",
                Label = "Environment",
                Description = "Use Sandbox for testing, Production for live transactions",
                FieldType = ConfigurationFieldType.Select,
                IsRequired = true,
                DefaultValue = "sandbox",
                Options =
                [
                    new SelectOption { Value = "sandbox", Label = "Sandbox (Testing)" },
                    new SelectOption { Value = "production", Label = "Production (Live)" }
                ]
            },
            new ProviderConfigurationField
            {
                Key = "enableLogging",
                Label = "Enable API Logging",
                Description = "Log all API calls for debugging (not recommended for production)",
                FieldType = ConfigurationFieldType.Checkbox,
                IsRequired = false,
                DefaultValue = "false"
            },
            new ProviderConfigurationField
            {
                Key = "taxGroupMappings",
                Label = "Tax Group Mappings",
                Description = "Map your tax groups to Avalara tax codes. Find codes at taxcode.avatax.avalara.com",
                FieldType = ConfigurationFieldType.TaxGroupMapping,
                IsRequired = false
            },
            new ProviderConfigurationField
            {
                Key = "shippingTaxCode",
                Label = "Shipping Tax Code",
                Description = "Avalara tax code for shipping/freight (default: FR020100)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                DefaultValue = "FR020100",
                Placeholder = "FR020100"
            }
        ]);
    }

    public override async ValueTask ConfigureAsync(
        TaxProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        await base.ConfigureAsync(configuration, cancellationToken);

        if (configuration != null)
        {
            var accountIdRaw = GetRequiredConfigValue("accountId");
            var licenseKey = GetRequiredConfigValue("licenseKey");
            _companyCode = GetRequiredConfigValue("companyCode");
            var environment = GetConfigValue("environment") ?? "sandbox";
            var enableLogging = GetConfigBool("enableLogging");

            if (!int.TryParse(accountIdRaw, out var accountId))
            {
                throw new InvalidOperationException(
                    "Avalara accountId must be numeric when using AccountId/LicenseKey authentication.");
            }

            var avaTaxEnvironment = environment.Equals("production", StringComparison.OrdinalIgnoreCase)
                ? AvaTaxEnvironment.Production
                : AvaTaxEnvironment.Sandbox;

            _client = new AvaTaxClient("Merchello", "1.0", Environment.MachineName, avaTaxEnvironment)
                .WithSecurity(accountId, licenseKey);

            if (enableLogging)
            {
                // Log to a file in the temp directory for debugging
                var logPath = Path.Combine(Path.GetTempPath(), "avalara-merchello.log");
                _client.LogToFile(logPath);
            }
        }
        else
        {
            _client = null;
            _companyCode = null;
        }
    }

    public override async Task<TaxProviderValidationResult> ValidateConfigurationAsync(
        CancellationToken cancellationToken = default)
    {
        if (_client == null)
        {
            return TaxProviderValidationResult.Invalid("Provider not configured. Please enter your Avalara credentials.");
        }

        try
        {
            var pingResult = await _client.PingAsync();

            if (pingResult.authenticated == true)
            {
                return TaxProviderValidationResult.Valid(new Dictionary<string, string>
                {
                    ["version"] = pingResult.version ?? "Unknown",
                    ["authenticated"] = "true",
                    ["companyCode"] = _companyCode ?? "Not set"
                });
            }

            return TaxProviderValidationResult.Invalid(
                "Authentication failed. Please check your Account ID and License Key.");
        }
        catch (AvaTaxError ex)
        {
            var errorMessage = ex.error?.error?.message ?? "Unknown Avalara error";
            return TaxProviderValidationResult.Invalid($"Avalara API error: {errorMessage}");
        }
        catch (Exception ex)
        {
            return TaxProviderValidationResult.Invalid($"Connection failed: {ex.Message}");
        }
    }

    public override async Task<TaxCalculationResult> CalculateOrderTaxAsync(
        TaxCalculationRequest request,
        CancellationToken cancellationToken = default)
    {
        // Handle tax-exempt transactions first (no API call needed)
        if (request.IsTaxExempt)
        {
            return TaxCalculationResult.ZeroTax(request.LineItems);
        }

        // Check if provider is configured
        if (_client == null || string.IsNullOrWhiteSpace(_companyCode))
        {
            return TaxCalculationResult.Failed("Avalara provider not configured. Please configure your Avalara credentials.");
        }

        // Validate shipping address
        if (string.IsNullOrWhiteSpace(request.ShippingAddress?.CountryCode))
        {
            return TaxCalculationResult.Failed("Shipping address with country code is required for tax calculation.");
        }

        try
        {
            // Build the transaction model
            var normalizedReferenceNumber = string.IsNullOrWhiteSpace(request.ReferenceNumber)
                ? null
                : request.ReferenceNumber.Trim();

            var transaction = new CreateTransactionModel
            {
                type = request.IsEstimate ? DocumentType.SalesOrder : DocumentType.SalesInvoice,
                companyCode = _companyCode,
                customerCode = request.CustomerId?.ToString() ?? request.CustomerEmail ?? "GUEST",
                date = request.TransactionDate ?? DateTime.UtcNow,
                currencyCode = request.CurrencyCode,
                referenceCode = normalizedReferenceNumber,
                addresses = new AddressesModel
                {
                    shipTo = MapAddress(request.ShippingAddress)
                },
                lines = []
            };

            // Set transaction code from reference for idempotent authoritative retries/adjustments.
            if (!string.IsNullOrWhiteSpace(normalizedReferenceNumber))
            {
                transaction.code = normalizedReferenceNumber;
            }

            // Add exemption certificate if provided
            if (!string.IsNullOrWhiteSpace(request.TaxExemptionNumber))
            {
                transaction.exemptionNo = request.TaxExemptionNumber;
            }

            // Add line items
            var lineNumber = 1;
            foreach (var item in request.LineItems)
            {
                // Use mapped tax code from TaxGroupId, fall back to explicit TaxCode, then default
                var mappedTaxCode = GetTaxCodeForTaxGroup(item.TaxGroupId) ?? item.TaxCode ?? DefaultTaxCode;
                var taxCode = item.IsTaxable ? mappedTaxCode : NonTaxableTaxCode;

                transaction.lines.Add(new LineItemModel
                {
                    number = lineNumber.ToString(),
                    itemCode = item.Sku,
                    description = item.Name,
                    quantity = item.Quantity,
                    amount = item.Amount * item.Quantity,
                    taxCode = taxCode,
                    taxIncluded = false
                });
                lineNumber++;
            }

            // Add shipping as a separate line item if applicable
            if (request.ShippingAmount > 0)
            {
                var shippingCode = GetShippingTaxCode() ?? ShippingTaxCode;
                transaction.lines.Add(new LineItemModel
                {
                    number = "SHIPPING",
                    itemCode = "SHIPPING",
                    description = "Shipping & Handling",
                    quantity = 1,
                    amount = request.ShippingAmount,
                    taxCode = shippingCode,
                    taxIncluded = false
                });
            }

            // Call Avalara API. For authoritative flows, prefer CreateOrAdjust with a deterministic code.
            var useCreateOrAdjust = !request.IsEstimate && !string.IsNullOrWhiteSpace(transaction.code);
            var result = useCreateOrAdjust
                ? await _client.CreateOrAdjustTransactionAsync(
                    TransactionResponseIncludes,
                    new CreateOrAdjustTransactionModel
                    {
                        adjustmentReason = AdjustmentReason.NotAdjusted,
                        adjustmentDescription = AuthoritativeAdjustmentDescription,
                        createTransactionModel = transaction
                    })
                : await _client.CreateTransactionAsync(TransactionResponseIncludes, transaction);

            // Check for successful response
            if (result.status == DocumentStatus.Saved ||
                result.status == DocumentStatus.Posted ||
                result.status == DocumentStatus.Committed ||
                result.status == DocumentStatus.PendingApproval ||
                result.status == DocumentStatus.Temporary)
            {
                return MapTransactionResult(request, result);
            }

            return TaxCalculationResult.Failed($"Avalara returned unexpected status: {result.status}");
        }
        catch (AvaTaxError ex)
        {
            var errorMessage = ex.error?.error?.message ?? "Unknown Avalara error";
            var errorCode = ex.error?.error?.code?.ToString() ?? "Unknown";
            return TaxCalculationResult.Failed($"Avalara error ({errorCode}): {errorMessage}");
        }
        catch (Exception ex)
        {
            return TaxCalculationResult.Failed($"Tax calculation failed: {ex.Message}");
        }
    }

    /// <summary>
    /// Maps a Merchello Address to an Avalara AddressLocationInfo.
    /// </summary>
    private static AddressLocationInfo MapAddress(Locality.Models.Address address)
    {
        return new AddressLocationInfo
        {
            line1 = address.AddressOne,
            line2 = address.AddressTwo,
            city = address.TownCity,
            region = address.CountyState?.RegionCode,
            postalCode = address.PostalCode,
            country = address.CountryCode
        };
    }

    /// <summary>
    /// Maps Avalara transaction result to Merchello TaxCalculationResult.
    /// </summary>
    private static TaxCalculationResult MapTransactionResult(
        TaxCalculationRequest request,
        TransactionModel transaction)
    {
        var lineResults = new List<LineTaxResult>();
        decimal shippingTax = 0;

        // Map line item results
        var lineNumber = 1;
        foreach (var item in request.LineItems)
        {
            var avalaraLine = transaction.lines?.FirstOrDefault(l =>
                l.lineNumber == lineNumber.ToString());

            decimal taxRate = 0;
            decimal taxAmount = 0;
            string? jurisdiction = null;

            if (avalaraLine != null)
            {
                taxAmount = avalaraLine.tax ?? 0;

                // Calculate effective tax rate
                if (avalaraLine.taxableAmount > 0)
                {
                    taxRate = (taxAmount / avalaraLine.taxableAmount.Value) * 100;
                }

                // Get primary jurisdiction from details
                var primaryDetail = avalaraLine.details?.FirstOrDefault();
                if (primaryDetail != null)
                {
                    jurisdiction = !string.IsNullOrWhiteSpace(primaryDetail.region)
                        ? $"{primaryDetail.country}-{primaryDetail.region}"
                        : primaryDetail.country;
                }
            }

            lineResults.Add(new LineTaxResult
            {
                LineItemId = item.LineItemId,
                Sku = item.Sku,
                TaxRate = Math.Round(taxRate, 4),
                TaxAmount = taxAmount,
                IsTaxable = item.IsTaxable,
                TaxJurisdiction = jurisdiction
            });

            lineNumber++;
        }

        // Get shipping tax if shipping was included
        if (request.ShippingAmount > 0)
        {
            var shippingLine = transaction.lines?.FirstOrDefault(l => l.lineNumber == "SHIPPING");
            shippingTax = shippingLine?.tax ?? 0;
        }

        return TaxCalculationResult.Successful(
            totalTax: lineResults.Sum(r => r.TaxAmount) + shippingTax,
            lineResults: lineResults,
            shippingTax: shippingTax,
            transactionId: transaction.code
        );
    }
}
