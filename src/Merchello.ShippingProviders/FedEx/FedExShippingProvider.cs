using System.Text.Json;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.ShippingProviders.FedEx.Models;

namespace Merchello.ShippingProviders.FedEx;

/// <summary>
/// FedEx shipping provider with real-time rate quotes via FedEx REST API.
/// </summary>
public class FedExShippingProvider : ShippingProviderBase, IDisposable
{
    private FedExApiClient? _apiClient;
    private bool _disposed;

    /// <summary>
    /// Creates a new FedEx shipping provider instance.
    /// </summary>
    public FedExShippingProvider()
    {
    }

    /// <inheritdoc />
    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "fedex",
        DisplayName = "FedEx",
        Icon = "icon-truck",
        Description = "Real-time FedEx shipping rates via FedEx REST API",
        SupportsRealTimeRates = true,
        SupportsTracking = true,
        SupportsLabelGeneration = false,
        SupportsDeliveryDateSelection = false,
        SupportsInternational = true,
        RequiresFullAddress = true,
        SetupInstructions = """
            ## FedEx API Setup Instructions

            ### 1. Create a FedEx Developer Account

            1. Go to [developer.fedex.com](https://developer.fedex.com)
            2. Click "Sign Up" and create an account
            3. Verify your email address

            ### 2. Create an API Project

            1. Log into the FedEx Developer Portal
            2. Go to "My Projects" → "Create a Project"
            3. Select the APIs you need:
               - **Rate API** (required for shipping quotes)
               - **Track API** (optional, for tracking)
            4. Complete the project setup

            ### 3. Get Your Credentials

            After project approval, you'll receive:
            - **API Key** (Client ID)
            - **Secret Key** (Client Secret)
            - **Account Number** (from your FedEx account)

            ### 4. Testing

            Use the Sandbox environment for testing:
            - Use your own **API Key** and **Secret Key** from the Developer Portal
            - Use the FedEx test account number for sandbox requests:
              - **Test Account Number:** `740561073`
              - **Test Meter Number:** `118794267`
            - Test with sample addresses before going live

            > **Note:** Do not use your production account number in sandbox mode.
            > The test account number above is provided by FedEx for sandbox testing.

            ### 5. Going Live

            1. Complete FedEx production access requirements
            2. Switch to "Production" environment in settings
            3. Update credentials with production API keys
            4. Replace the test account number with your actual FedEx account number
            """,
        ConfigCapabilities = new ProviderConfigCapabilities
        {
            HasLocationBasedCosts = false,
            HasWeightTiers = false,
            UsesLiveRates = true,
            RequiresGlobalConfig = true
        }
    };

    /// <summary>
    /// Static list of FedEx service types. Defined once and reused for both
    /// GetSupportedServiceTypesAsync and rate response mapping.
    /// </summary>
    private static readonly IReadOnlyList<ShippingServiceType> SupportedServiceTypes =
    [
        new ShippingServiceType { Code = "FEDEX_GROUND", DisplayName = "FedEx Ground", ProviderKey = "fedex" },
        new ShippingServiceType { Code = "FEDEX_2_DAY", DisplayName = "FedEx 2Day", ProviderKey = "fedex" },
        new ShippingServiceType { Code = "FEDEX_2_DAY_AM", DisplayName = "FedEx 2Day A.M.", ProviderKey = "fedex" },
        new ShippingServiceType { Code = "STANDARD_OVERNIGHT", DisplayName = "FedEx Standard Overnight", ProviderKey = "fedex" },
        new ShippingServiceType { Code = "PRIORITY_OVERNIGHT", DisplayName = "FedEx Priority Overnight", ProviderKey = "fedex" },
        new ShippingServiceType { Code = "FIRST_OVERNIGHT", DisplayName = "FedEx First Overnight", ProviderKey = "fedex" },
        new ShippingServiceType { Code = "INTERNATIONAL_ECONOMY", DisplayName = "FedEx International Economy", ProviderKey = "fedex" },
        new ShippingServiceType { Code = "INTERNATIONAL_PRIORITY", DisplayName = "FedEx International Priority", ProviderKey = "fedex" }
    ];

    /// <summary>
    /// Lookup dictionary for O(1) service type resolution.
    /// </summary>
    private static readonly Dictionary<string, ShippingServiceType> ServiceTypeLookup =
        SupportedServiceTypes.ToDictionary(st => st.Code, StringComparer.OrdinalIgnoreCase);

    /// <inheritdoc />
    public override ValueTask<IReadOnlyList<ShippingServiceType>> GetSupportedServiceTypesAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult(SupportedServiceTypes);
    }

    /// <inheritdoc />
    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new ShippingProviderConfigurationField
            {
                Key = "clientId",
                Label = "API Key (Client ID)",
                Description = "Your FedEx API Key from the Developer Portal",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "l7xx..."
            },
            new ShippingProviderConfigurationField
            {
                Key = "clientSecret",
                Label = "Secret Key",
                Description = "Your FedEx Secret Key from the Developer Portal",
                FieldType = ConfigurationFieldType.Password,
                IsSensitive = true,
                IsRequired = true
            },
            new ShippingProviderConfigurationField
            {
                Key = "accountNumber",
                Label = "Account Number",
                Description = "Your FedEx Account Number",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "123456789"
            },
            new ShippingProviderConfigurationField
            {
                Key = "environment",
                Label = "Environment",
                Description = "Use Sandbox for testing, Production for live rates",
                FieldType = ConfigurationFieldType.Select,
                IsRequired = true,
                DefaultValue = "sandbox",
                Options =
                [
                    new SelectOption { Value = "sandbox", Label = "Sandbox (Testing)" },
                    new SelectOption { Value = "production", Label = "Production (Live)" }
                ]
            }
        ]);
    }

    /// <inheritdoc />
    /// <remarks>
    /// Service type selection is handled via GetSupportedServiceTypesAsync - the UI generates
    /// the dropdown from that list. This method only returns additional configuration fields.
    /// </remarks>
    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetMethodConfigFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new ShippingProviderConfigurationField
            {
                Key = "name",
                Label = "Method Name",
                Description = "Display name shown to customers (optional, defaults to service type name)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                Placeholder = "e.g., FedEx Ground"
            },
            new ShippingProviderConfigurationField
            {
                Key = "markup",
                Label = "Markup %",
                Description = "Percentage to add to FedEx rates (e.g., 10 for 10%)",
                FieldType = ConfigurationFieldType.Percentage,
                IsRequired = false,
                DefaultValue = "0"
            }
        ]);
    }

    /// <inheritdoc />
    public override async ValueTask ConfigureAsync(
        Core.Shipping.Models.ShippingProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        await base.ConfigureAsync(configuration, cancellationToken);

        // Dispose existing resources before reconfiguring
        DisposeApiClient();

        if (configuration?.SettingsJson == null)
        {
            return;
        }

        try
        {
            var settings = JsonSerializer.Deserialize<Dictionary<string, string>>(configuration.SettingsJson);
            if (settings == null)
            {
                return;
            }

            var clientId = settings.GetValueOrDefault("clientId");
            var clientSecret = settings.GetValueOrDefault("clientSecret");
            var accountNumber = settings.GetValueOrDefault("accountNumber");
            var environment = settings.GetValueOrDefault("environment") ?? "sandbox";

            if (string.IsNullOrEmpty(clientId) ||
                string.IsNullOrEmpty(clientSecret) ||
                string.IsNullOrEmpty(accountNumber))
            {
                return;
            }

            var useSandbox = environment.Equals("sandbox", StringComparison.OrdinalIgnoreCase);

            // Create API client with its own HttpClient configured for gzip decompression
            // (FedEx API returns gzip-compressed responses)
            _apiClient = new FedExApiClient(
                clientId,
                clientSecret,
                accountNumber,
                useSandbox);
        }
        catch (JsonException)
        {
            // Configuration JSON is malformed - provider will remain unconfigured
            DisposeApiClient();
        }
    }

    private void DisposeApiClient()
    {
        _apiClient?.Dispose();
        _apiClient = null;
    }

    /// <inheritdoc />
    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        // FedEx requires full address for accurate rates
        if (request.IsEstimateMode)
            return false;

        // Must be configured
        if (_apiClient == null)
            return false;

        // Must have shippable items with weight
        return request.Items.Any(i => i.IsShippable && (i.TotalWeightKg ?? 0) > 0);
    }

    /// <inheritdoc />
    public override async Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsAvailableFor(request))
            return null;

        if (_apiClient == null)
        {
            return new ShippingRateQuote
            {
                ProviderKey = Metadata.Key,
                ProviderName = Metadata.DisplayName,
                ServiceLevels = [],
                Errors = ["FedEx provider is not configured. Please add API credentials."]
            };
        }

        try
        {
            // Build origin address from warehouse
            var origin = new FedExAddress
            {
                StreetLines = request.OriginAddress?.AddressOne != null
                    ? [request.OriginAddress.AddressOne, request.OriginAddress.AddressTwo ?? ""]
                    : null,
                City = request.OriginAddress?.TownCity,
                StateOrProvinceCode = request.OriginAddress?.CountyState?.RegionCode,
                PostalCode = request.OriginAddress?.PostalCode ?? "",
                CountryCode = request.OriginAddress?.CountryCode ?? "US"
            };

            // Build destination address
            var destination = new FedExAddress
            {
                StreetLines = request.DestinationAddress?.AddressOne != null
                    ? [request.DestinationAddress.AddressOne, request.DestinationAddress.AddressTwo ?? ""]
                    : null,
                City = request.DestinationAddress?.TownCity ?? request.City,
                StateOrProvinceCode = request.DestinationAddress?.CountyState?.RegionCode ?? request.StateOrProvinceCode,
                PostalCode = request.DestinationAddress?.PostalCode ?? request.PostalCode ?? "",
                CountryCode = request.DestinationAddress?.CountryCode ?? request.CountryCode
            };

            // Build packages from request
            var packages = BuildPackages(request);

            // Request rates for all services (no serviceType filter)
            var rateRequest = _apiClient.BuildRateRequest(origin, destination, packages);
            var response = await _apiClient.GetRatesAsync(rateRequest, cancellationToken);

            // Check for errors
            if (response.Errors?.Count > 0)
            {
                return new ShippingRateQuote
                {
                    ProviderKey = Metadata.Key,
                    ProviderName = Metadata.DisplayName,
                    ServiceLevels = [],
                    Errors = response.Errors.Select(FormatFedExError).ToList()
                };
            }

            // Build service levels from response
            var serviceLevels = new List<ShippingServiceLevel>();

            if (response.Output?.RateReplyDetails != null)
            {
                foreach (var detail in response.Output.RateReplyDetails)
                {
                    var ratedDetail = detail.RatedShipmentDetails?
                        .FirstOrDefault(r => r.RateType == "ACCOUNT")
                        ?? detail.RatedShipmentDetails?.FirstOrDefault();

                    if (ratedDetail == null)
                        continue;

                    var totalCost = ratedDetail.TotalNetCharge
                        ?? ratedDetail.ShipmentRateDetail?.TotalNetCharge
                        ?? 0;

                    var currency = ratedDetail.Currency
                        ?? ratedDetail.ShipmentRateDetail?.Currency
                        ?? request.CurrencyCode
                        ?? "USD";

                    // Parse transit days
                    TimeSpan? transitTime = null;
                    if (int.TryParse(detail.Commit?.TransitDays, out var days))
                    {
                        transitTime = TimeSpan.FromDays(days);
                    }

                    // Resolve the concrete service type from our defined list
                    var serviceType = ServiceTypeLookup.GetValueOrDefault(detail.ServiceType);

                    serviceLevels.Add(new ShippingServiceLevel
                    {
                        ServiceCode = $"fedex-{detail.ServiceType.ToLowerInvariant()}",
                        ServiceName = serviceType?.DisplayName ?? detail.ServiceName ?? detail.ServiceType,
                        TotalCost = totalCost,
                        CurrencyCode = currency,
                        TransitTime = transitTime,
                        Description = BuildTransitDescription(detail),
                        ServiceType = serviceType ?? new ShippingServiceType
                        {
                            Code = detail.ServiceType,
                            DisplayName = detail.ServiceName ?? detail.ServiceType,
                            ProviderKey = Metadata.Key
                        },
                        ExtendedProperties = new Dictionary<string, string>
                        {
                            ["trackingUrlTemplate"] = "https://www.fedex.com/fedextrack/?trknbr={trackingNumber}"
                        }
                    });
                }
            }

            // Sort by cost
            serviceLevels = serviceLevels.OrderBy(s => s.TotalCost).ToList();

            return new ShippingRateQuote
            {
                ProviderKey = Metadata.Key,
                ProviderName = Metadata.DisplayName,
                ServiceLevels = serviceLevels
            };
        }
        catch (HttpRequestException ex)
        {
            return new ShippingRateQuote
            {
                ProviderKey = Metadata.Key,
                ProviderName = Metadata.DisplayName,
                ServiceLevels = [],
                Errors = [$"FedEx API error: {ex.Message}"]
            };
        }
        catch (Exception ex)
        {
            return new ShippingRateQuote
            {
                ProviderKey = Metadata.Key,
                ProviderName = Metadata.DisplayName,
                ServiceLevels = [],
                Errors = [$"Error getting FedEx rates: {ex.Message}"]
            };
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// Overrides the base implementation to filter FedEx results by service type
    /// and apply per-method markup from ProviderSettings.
    /// </remarks>
    public override async Task<ShippingRateQuote?> GetRatesForServicesAsync(
        ShippingQuoteRequest request,
        IReadOnlyList<string> serviceTypes,
        IReadOnlyList<ShippingOptionSnapshot> shippingOptions,
        CancellationToken cancellationToken = default)
    {
        // Get all FedEx rates
        var quote = await GetRatesAsync(request, cancellationToken);
        if (quote == null)
            return null;

        // Build lookup for service type -> shipping option (for markup)
        var optionsByServiceType = shippingOptions
            .Where(o => !string.IsNullOrEmpty(o.ServiceType))
            .ToDictionary(o => o.ServiceType!, o => o, StringComparer.OrdinalIgnoreCase);

        // Filter to only requested service types and apply markup
        var serviceTypeSet = new HashSet<string>(serviceTypes, StringComparer.OrdinalIgnoreCase);
        var filteredLevels = new List<ShippingServiceLevel>();

        foreach (var sl in quote.ServiceLevels)
        {
            // Get the FedEx service type from the concrete ServiceType property
            var fedexType = sl.ServiceType?.Code;
            if (fedexType is null || !serviceTypeSet.Contains(fedexType))
                continue;

            var totalCost = sl.TotalCost;
            var serviceName = sl.ServiceName;
            var extendedProps = sl.ExtendedProperties != null
                ? new Dictionary<string, string>(sl.ExtendedProperties)
                : new Dictionary<string, string>();

            // Apply markup if configured for this service type
            if (optionsByServiceType.TryGetValue(fedexType, out var option))
            {
                var markup = GetMarkupFromSettings(option.ProviderSettings);
                if (markup > 0)
                {
                    totalCost = sl.TotalCost * (1 + markup / 100m);
                    totalCost = Math.Round(totalCost, 2);
                }

                // Use custom name from ShippingOption if provided
                if (!string.IsNullOrEmpty(option.Name))
                {
                    serviceName = option.Name;
                }

                // Add ShippingOptionId to extended properties
                extendedProps["shippingOptionId"] = option.Id.ToString();
            }

            // Create new service level with potentially modified values
            filteredLevels.Add(new ShippingServiceLevel
            {
                ServiceCode = sl.ServiceCode,
                ServiceName = serviceName,
                TotalCost = totalCost,
                CurrencyCode = sl.CurrencyCode,
                TransitTime = sl.TransitTime,
                EstimatedDeliveryDate = sl.EstimatedDeliveryDate,
                Description = sl.Description,
                ServiceType = sl.ServiceType,
                ExtendedProperties = extendedProps
            });
        }

        // Sort by cost
        filteredLevels = filteredLevels.OrderBy(s => s.TotalCost).ToList();

        return new ShippingRateQuote
        {
            ProviderKey = quote.ProviderKey,
            ProviderName = quote.ProviderName,
            ServiceLevels = filteredLevels,
            Errors = quote.Errors
        };
    }

    private static decimal GetMarkupFromSettings(string? providerSettingsJson)
    {
        if (string.IsNullOrEmpty(providerSettingsJson))
            return 0;

        try
        {
            var settings = JsonSerializer.Deserialize<Dictionary<string, string>>(providerSettingsJson);
            if (settings?.TryGetValue("markup", out var markupStr) == true &&
                decimal.TryParse(markupStr, out var markup))
            {
                return markup;
            }
        }
        catch (JsonException)
        {
            // Invalid JSON, ignore
        }

        return 0;
    }

    private static List<FedExPackageLineItem> BuildPackages(ShippingQuoteRequest request)
    {
        // If pre-built packages exist, use them
        if (request.Packages.Count > 0)
        {
            return request.Packages.Select(p => new FedExPackageLineItem
            {
                Weight = new FedExWeight
                {
                    Units = "KG",
                    Value = p.WeightKg
                },
                Dimensions = p.LengthCm.HasValue && p.WidthCm.HasValue && p.HeightCm.HasValue
                             && p.LengthCm.Value > 0 && p.WidthCm.Value > 0 && p.HeightCm.Value > 0
                    ? new FedExDimensions
                    {
                        Length = (int)Math.Ceiling(p.LengthCm.Value),
                        Width = (int)Math.Ceiling(p.WidthCm.Value),
                        Height = (int)Math.Ceiling(p.HeightCm.Value),
                        Units = "CM"
                    }
                    : null
            }).ToList();
        }

        // Otherwise, create a single package from total weight
        var totalWeight = request.Items
            .Where(i => i.IsShippable)
            .Sum(i => i.TotalWeightKg ?? 0);

        if (totalWeight <= 0)
            totalWeight = 0.5m; // Minimum weight

        return
        [
            new FedExPackageLineItem
            {
                Weight = new FedExWeight
                {
                    Units = "KG",
                    Value = totalWeight
                }
            }
        ];
    }

    private static string? BuildTransitDescription(FedExRateReplyDetail detail)
    {
        if (detail.Commit?.TransitDays != null)
        {
            return $"Estimated {detail.Commit.TransitDays} business day(s)";
        }

        if (detail.Commit?.DateDetail?.DayCxsFormat != null)
        {
            return $"Delivery by {detail.Commit.DateDetail.DayCxsFormat}";
        }

        return null;
    }

    private static string FormatFedExError(FedExError error)
    {
        var message = error.Message ?? error.Code ?? "Unknown error";

        // Include parameter details if available (helps debugging)
        if (error.ParameterList?.Count > 0)
        {
            var parameters = string.Join(", ", error.ParameterList
                .Where(p => !string.IsNullOrEmpty(p.Key))
                .Select(p => $"{p.Key}: {p.Value}"));

            if (!string.IsNullOrEmpty(parameters))
            {
                message += $" ({parameters})";
            }
        }

        return message;
    }

    /// <summary>
    /// Disposes resources used by the provider.
    /// </summary>
    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    /// <summary>
    /// Disposes resources.
    /// </summary>
    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;

        if (disposing)
        {
            DisposeApiClient();
        }

        _disposed = true;
    }
}
