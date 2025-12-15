using System.Globalization;
using System.Text.Json;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.ShippingProviders.UPS.Models;
using Microsoft.Extensions.Options;

namespace Merchello.ShippingProviders.UPS;

/// <summary>
/// UPS shipping provider with real-time rate quotes via UPS REST API.
/// </summary>
public class UpsShippingProvider(
    IOptions<MerchelloSettings> settings,
    IExchangeRateCache exchangeRateCache,
    ICurrencyService currencyService) : ShippingProviderBase, IDisposable
{
    private readonly MerchelloSettings _settings = settings.Value;
    private readonly IExchangeRateCache _exchangeRateCache = exchangeRateCache;
    private readonly ICurrencyService _currencyService = currencyService;

    private UpsApiClient? _apiClient;
    private bool _disposed;

    /// <inheritdoc />
    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "ups",
        DisplayName = "UPS",
        Icon = "icon-truck",
        Description = "Real-time UPS shipping rates via UPS REST API",
        SupportsRealTimeRates = true,
        SupportsTracking = true,
        SupportsLabelGeneration = false,
        SupportsDeliveryDateSelection = false,
        SupportsInternational = true,
        RequiresFullAddress = true,
        SetupInstructions = """
            ## UPS API Setup Instructions

            ### 1. Create a UPS Developer Account

            1. Go to [developer.ups.com](https://developer.ups.com)
            2. Click "Get Started" and create an account
            3. Link your UPS account (or create a new one)

            ### 2. Create an Application

            1. Log into the UPS Developer Portal
            2. Go to "Apps" and click "Add Apps"
            3. Select the APIs you need:
               - **OAuth** (required for authentication)
               - **Rating** (required for shipping quotes)
               - **Tracking** (optional)
            4. Complete the application setup

            ### 3. Get Your Credentials

            After application approval, you'll receive:
            - **Client ID**
            - **Client Secret**
            - **Account Number** (your UPS shipper number)

            ### 4. Testing

            Use the Sandbox environment for testing:
            - Your Client ID and Secret work for both environments
            - Test addresses before going live
            - Sandbox returns simulated rates

            ### 5. Going Live

            1. Switch to "Production" environment in settings
            2. Your production rates will reflect your negotiated pricing
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
    /// Static list of UPS service types. Defined once and reused for both
    /// GetSupportedServiceTypesAsync and rate response mapping.
    /// </summary>
    private static readonly IReadOnlyList<ShippingServiceType> SupportedServiceTypes =
    [
        // Domestic US Services
        new ShippingServiceType { Code = "14", DisplayName = "UPS Next Day Air Early", ProviderKey = "ups" },
        new ShippingServiceType { Code = "01", DisplayName = "UPS Next Day Air", ProviderKey = "ups" },
        new ShippingServiceType { Code = "13", DisplayName = "UPS Next Day Air Saver", ProviderKey = "ups" },
        new ShippingServiceType { Code = "59", DisplayName = "UPS 2nd Day Air A.M.", ProviderKey = "ups" },
        new ShippingServiceType { Code = "02", DisplayName = "UPS 2nd Day Air", ProviderKey = "ups" },
        new ShippingServiceType { Code = "12", DisplayName = "UPS 3 Day Select", ProviderKey = "ups" },
        new ShippingServiceType { Code = "03", DisplayName = "UPS Ground", ProviderKey = "ups" },
        // International Services
        new ShippingServiceType { Code = "07", DisplayName = "UPS Worldwide Express", ProviderKey = "ups" },
        new ShippingServiceType { Code = "54", DisplayName = "UPS Worldwide Express Plus", ProviderKey = "ups" },
        new ShippingServiceType { Code = "08", DisplayName = "UPS Worldwide Expedited", ProviderKey = "ups" },
        new ShippingServiceType { Code = "65", DisplayName = "UPS Worldwide Saver", ProviderKey = "ups" },
        new ShippingServiceType { Code = "11", DisplayName = "UPS Standard", ProviderKey = "ups" },
        new ShippingServiceType { Code = "96", DisplayName = "UPS Worldwide Express Freight", ProviderKey = "ups" }
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
                Label = "Client ID",
                Description = "Your UPS API Client ID from the Developer Portal",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "Your Client ID"
            },
            new ShippingProviderConfigurationField
            {
                Key = "clientSecret",
                Label = "Client Secret",
                Description = "Your UPS API Client Secret from the Developer Portal",
                FieldType = ConfigurationFieldType.Password,
                IsSensitive = true,
                IsRequired = true
            },
            new ShippingProviderConfigurationField
            {
                Key = "accountNumber",
                Label = "Account Number",
                Description = "Your UPS Account/Shipper Number (6 digits)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "123456"
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
            },
            new ShippingProviderConfigurationField
            {
                Key = "useNegotiatedRates",
                Label = "Use Negotiated Rates",
                Description = "Enable to use your negotiated/contract rates (requires valid account)",
                FieldType = ConfigurationFieldType.Checkbox,
                IsRequired = false,
                DefaultValue = "false"
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
                Placeholder = "e.g., UPS Ground"
            },
            new ShippingProviderConfigurationField
            {
                Key = "markup",
                Label = "Markup %",
                Description = "Percentage to add to UPS rates (e.g., 10 for 10%)",
                FieldType = ConfigurationFieldType.Percentage,
                IsRequired = false,
                DefaultValue = "0"
            }
        ]);
    }

    /// <inheritdoc />
    public override async ValueTask ConfigureAsync(
        ShippingProviderConfiguration? configuration,
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
            var useNegotiatedRates = settings.GetValueOrDefault("useNegotiatedRates")?.Equals("true", StringComparison.OrdinalIgnoreCase) ?? false;

            if (string.IsNullOrEmpty(clientId) ||
                string.IsNullOrEmpty(clientSecret) ||
                string.IsNullOrEmpty(accountNumber))
            {
                return;
            }

            var useSandbox = environment.Equals("sandbox", StringComparison.OrdinalIgnoreCase);

            // Create API client
            _apiClient = new UpsApiClient(
                clientId,
                clientSecret,
                accountNumber,
                useSandbox,
                useNegotiatedRates);
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
        // UPS requires full address for accurate rates
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
                Errors = ["UPS provider is not configured. Please add API credentials."]
            };
        }

        try
        {
            // Determine request currency for conversion
            var requestCurrency = request.CurrencyCode ?? _settings.StoreCurrencyCode;
            var errors = new List<string>();

            // Build origin address from warehouse
            var origin = BuildUpsAddress(request.OriginAddress);

            // Build destination address
            var destination = BuildUpsAddress(request.DestinationAddress, request);

            // Build packages from request
            var packages = BuildPackages(request);

            // Request rates for all services
            var rateRequest = _apiClient.BuildRateRequest(origin, destination, packages);
            var response = await _apiClient.GetRatesAsync(rateRequest, cancellationToken);

            // Check for errors in response
            if (response.RateResponse?.Response?.ResponseStatus?.Code != "1")
            {
                var alerts = response.RateResponse?.Response?.Alert;
                if (alerts?.Count > 0)
                {
                    return new ShippingRateQuote
                    {
                        ProviderKey = Metadata.Key,
                        ProviderName = Metadata.DisplayName,
                        ServiceLevels = [],
                        Errors = alerts.Select(a => $"{a.Code}: {a.Description}").ToList()
                    };
                }
            }

            // Build service levels from response
            var serviceLevels = new List<ShippingServiceLevel>();

            if (response.RateResponse?.RatedShipment != null)
            {
                // Determine UPS response currency (from first rated shipment)
                var firstRated = response.RateResponse.RatedShipment.FirstOrDefault();
                var upsCurrency = firstRated?.TotalCharges?.CurrencyCode ?? "USD";

                // Get exchange rate if UPS currency differs from request currency
                decimal? upsToRequestRate = null;
                if (!string.Equals(upsCurrency, requestCurrency, StringComparison.OrdinalIgnoreCase))
                {
                    upsToRequestRate = await _exchangeRateCache.GetRateAsync(upsCurrency, requestCurrency, cancellationToken);
                    if (!upsToRequestRate.HasValue || upsToRequestRate.Value <= 0m)
                    {
                        errors.Add($"No exchange rate available to convert UPS rates from {upsCurrency} to {requestCurrency}.");
                    }
                }

                foreach (var rated in response.RateResponse.RatedShipment)
                {
                    var serviceCode = rated.Service?.Code;
                    if (serviceCode == null) continue;

                    // Get charges (prefer negotiated rates if available)
                    var charges = rated.NegotiatedRateCharges?.TotalCharge ?? rated.TotalCharges;
                    if (charges?.MonetaryValue == null) continue;

                    if (!decimal.TryParse(charges.MonetaryValue, NumberStyles.Number, CultureInfo.InvariantCulture, out var totalCost))
                        continue;

                    var rateCurrency = charges.CurrencyCode ?? upsCurrency;

                    // Convert to request currency if needed
                    var displayCurrency = requestCurrency;
                    if (upsToRequestRate.HasValue)
                    {
                        totalCost = _currencyService.Round(totalCost * upsToRequestRate.Value, requestCurrency);
                    }
                    else if (!string.Equals(rateCurrency, requestCurrency, StringComparison.OrdinalIgnoreCase))
                    {
                        // No exchange rate available - use UPS currency as-is
                        displayCurrency = rateCurrency;
                    }

                    // Parse transit days
                    TimeSpan? transitTime = null;
                    DateTime? estimatedDelivery = null;

                    if (rated.GuaranteedDelivery?.BusinessDaysInTransit != null &&
                        int.TryParse(rated.GuaranteedDelivery.BusinessDaysInTransit, out var days))
                    {
                        transitTime = TimeSpan.FromDays(days);
                    }

                    if (rated.TimeInTransit?.ServiceSummary?.EstimatedArrival?.Arrival?.Date != null)
                    {
                        if (DateTime.TryParseExact(
                            rated.TimeInTransit.ServiceSummary.EstimatedArrival.Arrival.Date,
                            "yyyyMMdd",
                            null,
                            System.Globalization.DateTimeStyles.None,
                            out var arrivalDate))
                        {
                            estimatedDelivery = arrivalDate;
                        }
                    }

                    // Resolve the concrete service type from our defined list
                    var serviceType = ServiceTypeLookup.GetValueOrDefault(serviceCode);

                    serviceLevels.Add(new ShippingServiceLevel
                    {
                        ServiceCode = $"ups-{serviceCode}",
                        ServiceName = serviceType?.DisplayName ?? rated.Service?.Description ?? serviceCode,
                        TotalCost = totalCost,
                        CurrencyCode = displayCurrency,
                        TransitTime = transitTime,
                        EstimatedDeliveryDate = estimatedDelivery,
                        Description = BuildTransitDescription(rated),
                        ServiceType = serviceType ?? new ShippingServiceType
                        {
                            Code = serviceCode,
                            DisplayName = rated.Service?.Description ?? serviceCode,
                            ProviderKey = Metadata.Key
                        },
                        ExtendedProperties = new Dictionary<string, string>
                        {
                            ["trackingUrlTemplate"] = "https://www.ups.com/track?tracknum={trackingNumber}"
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
                ServiceLevels = serviceLevels,
                Errors = errors
            };
        }
        catch (HttpRequestException ex)
        {
            return new ShippingRateQuote
            {
                ProviderKey = Metadata.Key,
                ProviderName = Metadata.DisplayName,
                ServiceLevels = [],
                Errors = [$"UPS API error: {ex.Message}"]
            };
        }
        catch (Exception ex)
        {
            return new ShippingRateQuote
            {
                ProviderKey = Metadata.Key,
                ProviderName = Metadata.DisplayName,
                ServiceLevels = [],
                Errors = [$"Error getting UPS rates: {ex.Message}"]
            };
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// Overrides the base implementation to filter UPS results by service type
    /// and apply per-method markup from ProviderSettings.
    /// </remarks>
    public override async Task<ShippingRateQuote?> GetRatesForServicesAsync(
        ShippingQuoteRequest request,
        IReadOnlyList<string> serviceTypes,
        IReadOnlyList<ShippingOptionSnapshot> shippingOptions,
        CancellationToken cancellationToken = default)
    {
        // Get all UPS rates
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
            // Get the UPS service type from the concrete ServiceType property
            var upsType = sl.ServiceType?.Code;
            if (upsType is null || !serviceTypeSet.Contains(upsType))
                continue;

            var totalCost = sl.TotalCost;
            var serviceName = sl.ServiceName;
            var extendedProps = sl.ExtendedProperties != null
                ? new Dictionary<string, string>(sl.ExtendedProperties)
                : new Dictionary<string, string>();

            // Apply markup if configured for this service type
            if (optionsByServiceType.TryGetValue(upsType, out var option))
            {
                var markup = GetMarkupFromSettings(option.ProviderSettings);
                if (markup > 0)
                {
                    totalCost = sl.TotalCost * (1 + markup / 100m);
                    totalCost = _currencyService.Round(totalCost, sl.CurrencyCode);
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
                decimal.TryParse(markupStr, NumberStyles.Number, CultureInfo.InvariantCulture, out var markup))
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

    private static UpsAddress BuildUpsAddress(Address? address, ShippingQuoteRequest? request = null)
    {
        if (address != null)
        {
            var addressLines = new List<string>();
            if (!string.IsNullOrEmpty(address.AddressOne))
                addressLines.Add(address.AddressOne);
            if (!string.IsNullOrEmpty(address.AddressTwo))
                addressLines.Add(address.AddressTwo);

            return new UpsAddress
            {
                AddressLine = addressLines.Count > 0 ? addressLines : null,
                City = address.TownCity,
                StateProvinceCode = address.CountyState?.RegionCode,
                PostalCode = address.PostalCode,
                CountryCode = address.CountryCode ?? "US"
            };
        }

        // Fallback to request properties for destination
        if (request != null)
        {
            return new UpsAddress
            {
                City = request.City,
                StateProvinceCode = request.StateOrProvinceCode,
                PostalCode = request.PostalCode,
                CountryCode = request.CountryCode
            };
        }

        return new UpsAddress { CountryCode = "US" };
    }

    private static List<UpsPackage> BuildPackages(ShippingQuoteRequest request)
    {
        // If pre-built packages exist, use them
        if (request.Packages.Count > 0)
        {
            return request.Packages.Select(p => new UpsPackage
            {
                PackagingType = new UpsPackagingType { Code = "02" },
                PackageWeight = new UpsPackageWeight
                {
                    UnitOfMeasurement = new UpsUnitOfMeasurement { Code = "KGS" },
                    Weight = p.WeightKg.ToString("F2")
                },
                Dimensions = p.LengthCm.HasValue && p.WidthCm.HasValue && p.HeightCm.HasValue
                             && p.LengthCm.Value > 0 && p.WidthCm.Value > 0 && p.HeightCm.Value > 0
                    ? new UpsDimensions
                    {
                        UnitOfMeasurement = new UpsUnitOfMeasurement { Code = "CM" },
                        Length = Math.Ceiling(p.LengthCm.Value).ToString(),
                        Width = Math.Ceiling(p.WidthCm.Value).ToString(),
                        Height = Math.Ceiling(p.HeightCm.Value).ToString()
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
            new UpsPackage
            {
                PackagingType = new UpsPackagingType { Code = "02" },
                PackageWeight = new UpsPackageWeight
                {
                    UnitOfMeasurement = new UpsUnitOfMeasurement { Code = "KGS" },
                    Weight = totalWeight.ToString("F2")
                }
            }
        ];
    }

    private static string? BuildTransitDescription(UpsRatedShipment rated)
    {
        if (rated.GuaranteedDelivery?.BusinessDaysInTransit != null)
        {
            var time = rated.GuaranteedDelivery.DeliveryByTime;
            if (!string.IsNullOrEmpty(time))
            {
                return $"Estimated {rated.GuaranteedDelivery.BusinessDaysInTransit} business day(s), by {time}";
            }
            return $"Estimated {rated.GuaranteedDelivery.BusinessDaysInTransit} business day(s)";
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
