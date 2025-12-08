using System.Text.Json;
using Merchello.Core.Shipping.Providers;
using Merchello.ShippingProviders.FedEx.Models;

namespace Merchello.ShippingProviders.FedEx;

/// <summary>
/// FedEx shipping provider with real-time rate quotes via FedEx REST API.
/// </summary>
public class FedExShippingProvider : ShippingProviderBase, IDisposable
{
    private FedExApiClient? _apiClient;
    private HttpClient? _httpClient;
    private bool _disposed;

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
            - Sandbox credentials are provided in the Developer Portal
            - Test with sample addresses before going live

            ### 5. Going Live

            1. Complete FedEx production access requirements
            2. Switch to "Production" environment in settings
            3. Update credentials with production API keys
            """,
        ConfigCapabilities = new ProviderConfigCapabilities
        {
            HasLocationBasedCosts = false,
            HasWeightTiers = false,
            UsesLiveRates = true,
            RequiresGlobalConfig = true
        }
    };

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
    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetMethodConfigFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new ShippingProviderConfigurationField
            {
                Key = "name",
                Label = "Method Name",
                Description = "Display name shown to customers",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "e.g., FedEx Ground"
            },
            new ShippingProviderConfigurationField
            {
                Key = "serviceType",
                Label = "Service Type",
                Description = "FedEx service to use for this method",
                FieldType = ConfigurationFieldType.Select,
                IsRequired = true,
                Options =
                [
                    new SelectOption { Value = "FEDEX_GROUND", Label = "FedEx Ground" },
                    new SelectOption { Value = "GROUND_HOME_DELIVERY", Label = "FedEx Home Delivery" },
                    new SelectOption { Value = "FEDEX_EXPRESS_SAVER", Label = "FedEx Express Saver" },
                    new SelectOption { Value = "FEDEX_2_DAY", Label = "FedEx 2Day" },
                    new SelectOption { Value = "FEDEX_2_DAY_AM", Label = "FedEx 2Day A.M." },
                    new SelectOption { Value = "STANDARD_OVERNIGHT", Label = "FedEx Standard Overnight" },
                    new SelectOption { Value = "PRIORITY_OVERNIGHT", Label = "FedEx Priority Overnight" },
                    new SelectOption { Value = "FIRST_OVERNIGHT", Label = "FedEx First Overnight" },
                    new SelectOption { Value = "INTERNATIONAL_ECONOMY", Label = "FedEx International Economy" },
                    new SelectOption { Value = "INTERNATIONAL_PRIORITY", Label = "FedEx International Priority" }
                ]
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

            // Create HTTP client (in production, use IHttpClientFactory)
            _httpClient = new HttpClient();
            _apiClient = new FedExApiClient(
                _httpClient,
                clientId,
                clientSecret,
                accountNumber,
                useSandbox);
        }
        catch
        {
            DisposeApiClient();
        }
    }

    private void DisposeApiClient()
    {
        _apiClient?.Dispose();
        _apiClient = null;
        _httpClient?.Dispose();
        _httpClient = null;
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
                    Errors = response.Errors.Select(e => e.Message ?? e.Code ?? "Unknown error").ToList()
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

                    serviceLevels.Add(new ShippingServiceLevel
                    {
                        ServiceCode = $"fedex-{detail.ServiceType.ToLowerInvariant()}",
                        ServiceName = GetServiceDisplayName(detail.ServiceType) ?? detail.ServiceName ?? detail.ServiceType,
                        TotalCost = totalCost,
                        CurrencyCode = currency,
                        TransitTime = transitTime,
                        Description = BuildTransitDescription(detail),
                        ExtendedProperties = new Dictionary<string, string>
                        {
                            ["fedexServiceType"] = detail.ServiceType,
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

    private static string? GetServiceDisplayName(string serviceType)
    {
        return serviceType switch
        {
            "FEDEX_GROUND" => "FedEx Ground",
            "GROUND_HOME_DELIVERY" => "FedEx Home Delivery",
            "FEDEX_EXPRESS_SAVER" => "FedEx Express Saver",
            "FEDEX_2_DAY" => "FedEx 2Day",
            "FEDEX_2_DAY_AM" => "FedEx 2Day A.M.",
            "STANDARD_OVERNIGHT" => "FedEx Standard Overnight",
            "PRIORITY_OVERNIGHT" => "FedEx Priority Overnight",
            "FIRST_OVERNIGHT" => "FedEx First Overnight",
            "INTERNATIONAL_ECONOMY" => "FedEx International Economy",
            "INTERNATIONAL_PRIORITY" => "FedEx International Priority",
            _ => null
        };
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
