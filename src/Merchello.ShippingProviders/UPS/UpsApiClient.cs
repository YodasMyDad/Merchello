using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Merchello.ShippingProviders.UPS.Models;

namespace Merchello.ShippingProviders.UPS;

/// <summary>
/// HTTP client for UPS REST API with OAuth2 authentication.
/// </summary>
public class UpsApiClient : IDisposable
{
    private const string ProductionBaseUrl = "https://onlinetools.ups.com";
    private const string SandboxBaseUrl = "https://wwwcie.ups.com";
    private const string ApiVersion = "v2409";

    private readonly HttpClient _httpClient;
    private readonly bool _ownsHttpClient;
    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly string _accountNumber;
    private readonly bool _useSandbox;
    private readonly bool _useNegotiatedRates;

    private string? _accessToken;
    private DateTime _tokenExpiry = DateTime.MinValue;
    private readonly SemaphoreSlim _tokenLock = new(1, 1);

    /// <summary>
    /// Creates a new UPS API client.
    /// </summary>
    /// <param name="clientId">UPS Client ID from Developer Portal.</param>
    /// <param name="clientSecret">UPS Client Secret from Developer Portal.</param>
    /// <param name="accountNumber">UPS Account/Shipper Number.</param>
    /// <param name="useSandbox">Whether to use sandbox environment.</param>
    /// <param name="useNegotiatedRates">Whether to request negotiated/contract rates.</param>
    public UpsApiClient(
        string clientId,
        string clientSecret,
        string accountNumber,
        bool useSandbox = true,
        bool useNegotiatedRates = false)
    {
        _clientId = clientId;
        _clientSecret = clientSecret;
        _accountNumber = accountNumber;
        _useSandbox = useSandbox;
        _useNegotiatedRates = useNegotiatedRates;

        // Create our own HttpClient with automatic decompression enabled
        var handler = new HttpClientHandler
        {
            AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate
        };
        _httpClient = new HttpClient(handler);
        _ownsHttpClient = true;
    }

    /// <summary>
    /// Creates a new UPS API client with a provided HttpClient.
    /// </summary>
    /// <param name="httpClient">HTTP client instance (must handle gzip decompression).</param>
    /// <param name="clientId">UPS Client ID from Developer Portal.</param>
    /// <param name="clientSecret">UPS Client Secret from Developer Portal.</param>
    /// <param name="accountNumber">UPS Account/Shipper Number.</param>
    /// <param name="useSandbox">Whether to use sandbox environment.</param>
    /// <param name="useNegotiatedRates">Whether to request negotiated/contract rates.</param>
    public UpsApiClient(
        HttpClient httpClient,
        string clientId,
        string clientSecret,
        string accountNumber,
        bool useSandbox = true,
        bool useNegotiatedRates = false)
    {
        _httpClient = httpClient;
        _ownsHttpClient = false;
        _clientId = clientId;
        _clientSecret = clientSecret;
        _accountNumber = accountNumber;
        _useSandbox = useSandbox;
        _useNegotiatedRates = useNegotiatedRates;
    }

    private string BaseUrl => _useSandbox ? SandboxBaseUrl : ProductionBaseUrl;

    /// <summary>
    /// Gets shipping rate quotes from UPS using the Shop endpoint (returns all services).
    /// </summary>
    /// <param name="request">Rate request details.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Rate response with available services and prices.</returns>
    public async Task<UpsRateResponseWrapper> GetRatesAsync(
        UpsRateRequestWrapper request,
        CancellationToken cancellationToken = default)
    {
        await EnsureAuthenticatedAsync(cancellationToken);

        var url = $"{BaseUrl}/api/rating/{ApiVersion}/Shop";

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
        httpRequest.Headers.Add("transId", Guid.NewGuid().ToString("N")[..32]);
        httpRequest.Headers.Add("transactionSrc", "Merchello");
        httpRequest.Content = JsonContent.Create(request, options: JsonOptions);

        var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var content = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            // Try to parse error response
            try
            {
                var errorResponse = JsonSerializer.Deserialize<UpsErrorResponse>(content, JsonOptions);
                if (errorResponse?.Response?.Errors?.Count > 0)
                {
                    // Return a response wrapper with error info in the response status
                    return new UpsRateResponseWrapper
                    {
                        RateResponse = new UpsRateResponse
                        {
                            Response = new UpsResponseInfo
                            {
                                ResponseStatus = new UpsResponseStatus
                                {
                                    Code = "0",
                                    Description = "Error"
                                },
                                Alert = errorResponse.Response.Errors.Select(e => new UpsAlert
                                {
                                    Code = e.Code,
                                    Description = e.Message
                                }).ToList()
                            }
                        }
                    };
                }
            }
            catch (JsonException)
            {
                // Response body is not valid JSON
            }

            return new UpsRateResponseWrapper
            {
                RateResponse = new UpsRateResponse
                {
                    Response = new UpsResponseInfo
                    {
                        ResponseStatus = new UpsResponseStatus
                        {
                            Code = "0",
                            Description = "Error"
                        },
                        Alert =
                        [
                            new UpsAlert
                            {
                                Code = response.StatusCode.ToString(),
                                Description = $"UPS API error: {response.StatusCode} - {content}"
                            }
                        ]
                    }
                }
            };
        }

        return JsonSerializer.Deserialize<UpsRateResponseWrapper>(content, JsonOptions)
            ?? new UpsRateResponseWrapper();
    }

    /// <summary>
    /// Ensures we have a valid access token.
    /// </summary>
    private async Task EnsureAuthenticatedAsync(CancellationToken cancellationToken)
    {
        // Check if we have a valid token (with 5 minute buffer)
        if (_accessToken != null && DateTime.UtcNow.AddMinutes(5) < _tokenExpiry)
        {
            return;
        }

        await _tokenLock.WaitAsync(cancellationToken);
        try
        {
            // Double-check after acquiring lock
            if (_accessToken != null && DateTime.UtcNow.AddMinutes(5) < _tokenExpiry)
            {
                return;
            }

            await RefreshTokenAsync(cancellationToken);
        }
        finally
        {
            _tokenLock.Release();
        }
    }

    /// <summary>
    /// Refreshes the OAuth access token.
    /// UPS uses HTTP Basic auth for the token endpoint (different from FedEx).
    /// </summary>
    private async Task RefreshTokenAsync(CancellationToken cancellationToken)
    {
        var url = $"{BaseUrl}/security/v1/oauth/token";

        using var request = new HttpRequestMessage(HttpMethod.Post, url);

        // UPS uses Basic auth for token endpoint: base64(clientId:clientSecret)
        var credentials = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{_clientId}:{_clientSecret}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials"
        });

        var response = await _httpClient.SendAsync(request, cancellationToken);
        var content = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"UPS authentication failed: {response.StatusCode} - {content}");
        }

        var authResponse = JsonSerializer.Deserialize<UpsAuthResponse>(content, JsonOptions);
        if (authResponse?.AccessToken == null)
        {
            throw new HttpRequestException("UPS authentication failed: No access token received");
        }

        _accessToken = authResponse.AccessToken;
        _tokenExpiry = DateTime.UtcNow.AddSeconds(authResponse.ExpiresIn);
    }

    /// <summary>
    /// Builds a rate request for the Shop endpoint.
    /// </summary>
    /// <param name="origin">Origin address.</param>
    /// <param name="destination">Destination address.</param>
    /// <param name="packages">Package list.</param>
    /// <param name="includeTimeInTransit">Whether to include time in transit info.</param>
    /// <returns>Complete rate request wrapper.</returns>
    public UpsRateRequestWrapper BuildRateRequest(
        UpsAddress origin,
        UpsAddress destination,
        List<UpsPackage> packages,
        bool includeTimeInTransit = true)
    {
        var request = new UpsRateRequestWrapper
        {
            RateRequest = new UpsRateRequest
            {
                Request = new UpsRequestInfo
                {
                    SubVersion = "2409",
                    TransactionReference = new UpsTransactionReference
                    {
                        CustomerContext = $"Merchello-{Guid.NewGuid():N}"
                    }
                },
                Shipment = new UpsShipment
                {
                    Shipper = new UpsShipper
                    {
                        ShipperNumber = _accountNumber,
                        Address = origin
                    },
                    ShipTo = new UpsShipTo
                    {
                        Address = destination
                    },
                    PaymentDetails = new UpsPaymentDetails
                    {
                        ShipmentCharge =
                        [
                            new UpsShipmentCharge
                            {
                                Type = "01", // Transportation
                                BillShipper = new UpsBillShipper
                                {
                                    AccountNumber = _accountNumber
                                }
                            }
                        ]
                    },
                    Package = packages
                }
            }
        };

        // Add negotiated rates indicator if configured
        if (_useNegotiatedRates)
        {
            request.RateRequest.Shipment.ShipmentRatingOptions = new UpsShipmentRatingOptions
            {
                NegotiatedRatesIndicator = "Y"
            };
        }

        // Add time in transit info
        if (includeTimeInTransit)
        {
            request.RateRequest.Shipment.DeliveryTimeInformation = new UpsDeliveryTimeInformation
            {
                PackageBillType = "03", // Non-Document
                Pickup = new UpsPickup
                {
                    Date = DateTime.Now.ToString("yyyyMMdd")
                }
            };
        }

        return request;
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = null, // UPS uses PascalCase
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    private bool _disposed;

    /// <summary>
    /// Disposes resources used by the API client.
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
            _tokenLock.Dispose();
            if (_ownsHttpClient)
            {
                _httpClient.Dispose();
            }
        }

        _disposed = true;
    }
}
