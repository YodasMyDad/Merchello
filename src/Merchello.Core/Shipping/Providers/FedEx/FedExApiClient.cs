using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Merchello.Core.Shipping.Providers.FedEx.Models;

namespace Merchello.Core.Shipping.Providers.FedEx;

/// <summary>
/// HTTP client for FedEx REST API with OAuth2 authentication.
/// </summary>
public class FedExApiClient : IDisposable
{
    private const string ProductionBaseUrl = "https://api.fedex.com";
    private const string SandboxBaseUrl = "https://apis-sandbox.fedex.com";

    private readonly HttpClient _httpClient;
    private readonly bool _ownsHttpClient;
    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly string _accountNumber;
    private readonly string _grantType;
    private readonly string? _childKey;
    private readonly string? _childSecret;
    private readonly bool _useSandbox;

    private string? _accessToken;
    private DateTime _tokenExpiry = DateTime.MinValue;
    private readonly SemaphoreSlim _tokenLock = new(1, 1);

    /// <summary>
    /// Creates a new FedEx API client.
    /// </summary>
    /// <param name="clientId">FedEx API Key (Client ID).</param>
    /// <param name="clientSecret">FedEx Secret Key (Client Secret).</param>
    /// <param name="accountNumber">FedEx Account Number.</param>
    /// <param name="grantType">OAuth grant type (for example client_credentials or csp_credentials).</param>
    /// <param name="childKey">Optional child key for parent-child/CSP auth flows.</param>
    /// <param name="childSecret">Optional child secret for parent-child/CSP auth flows.</param>
    /// <param name="useSandbox">Whether to use sandbox environment.</param>
    public FedExApiClient(
        string clientId,
        string clientSecret,
        string accountNumber,
        string grantType = "client_credentials",
        string? childKey = null,
        string? childSecret = null,
        bool useSandbox = true)
    {
        _clientId = clientId;
        _clientSecret = clientSecret;
        _accountNumber = accountNumber;
        _grantType = grantType;
        _childKey = childKey;
        _childSecret = childSecret;
        _useSandbox = useSandbox;

        // Create our own HttpClient with automatic decompression enabled
        // FedEx API returns gzip-compressed responses
        var handler = new HttpClientHandler
        {
            AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate
        };
        _httpClient = new HttpClient(handler);
        _ownsHttpClient = true;
    }

    /// <summary>
    /// Creates a new FedEx API client with a provided HttpClient.
    /// Note: The provided HttpClient must be configured to handle gzip decompression.
    /// </summary>
    /// <param name="httpClient">HTTP client instance (must handle gzip decompression).</param>
    /// <param name="clientId">FedEx API Key (Client ID).</param>
    /// <param name="clientSecret">FedEx Secret Key (Client Secret).</param>
    /// <param name="accountNumber">FedEx Account Number.</param>
    /// <param name="grantType">OAuth grant type (for example client_credentials or csp_credentials).</param>
    /// <param name="childKey">Optional child key for parent-child/CSP auth flows.</param>
    /// <param name="childSecret">Optional child secret for parent-child/CSP auth flows.</param>
    /// <param name="useSandbox">Whether to use sandbox environment.</param>
    public FedExApiClient(
        HttpClient httpClient,
        string clientId,
        string clientSecret,
        string accountNumber,
        string grantType = "client_credentials",
        string? childKey = null,
        string? childSecret = null,
        bool useSandbox = true)
    {
        _httpClient = httpClient;
        _ownsHttpClient = false;
        _clientId = clientId;
        _clientSecret = clientSecret;
        _accountNumber = accountNumber;
        _grantType = grantType;
        _childKey = childKey;
        _childSecret = childSecret;
        _useSandbox = useSandbox;
    }

    private string BaseUrl => _useSandbox ? SandboxBaseUrl : ProductionBaseUrl;

    /// <summary>
    /// Gets shipping rate quotes from FedEx.
    /// </summary>
    /// <param name="request">Rate request details.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Rate response with available services and prices.</returns>
    public async Task<FedExRateResponse> GetRatesAsync(
        FedExRateRequest request,
        CancellationToken cancellationToken = default)
    {
        await EnsureAuthenticatedAsync(cancellationToken);

        var url = $"{BaseUrl}/rate/v1/rates/quotes";

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
        httpRequest.Content = JsonContent.Create(request, options: JsonOptions);

        var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var content = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            // Try to parse error response
            try
            {
                var errorResponse = JsonSerializer.Deserialize<FedExRateResponse>(content, JsonOptions);
                if (errorResponse?.Errors?.Count > 0)
                {
                    return errorResponse;
                }
            }
            catch (JsonException)
            {
                // Response body is not valid JSON or doesn't match expected structure.
                // Fall through to generic error response below.
            }

            return new FedExRateResponse
            {
                Errors =
                [
                    new FedExError
                    {
                        Code = response.StatusCode.ToString(),
                        Message = $"FedEx API error: {response.StatusCode} - {content}"
                    }
                ]
            };
        }

        return JsonSerializer.Deserialize<FedExRateResponse>(content, JsonOptions)
            ?? new FedExRateResponse();
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
    /// </summary>
    private async Task RefreshTokenAsync(CancellationToken cancellationToken)
    {
        var url = $"{BaseUrl}/oauth/token";

        var grantType = string.IsNullOrWhiteSpace(_grantType)
            ? "client_credentials"
            : _grantType;

        var formData = new Dictionary<string, string>
        {
            ["grant_type"] = grantType,
            ["client_id"] = _clientId,
            ["client_secret"] = _clientSecret
        };

        if (!string.IsNullOrWhiteSpace(_childKey))
        {
            formData["child_key"] = _childKey;
        }

        if (!string.IsNullOrWhiteSpace(_childSecret))
        {
            formData["child_secret"] = _childSecret;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Content = new FormUrlEncodedContent(formData);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var response = await _httpClient.SendAsync(request, cancellationToken);
        var content = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"FedEx authentication failed: {response.StatusCode} - {content}");
        }

        var authResponse = JsonSerializer.Deserialize<FedExAuthResponse>(content, JsonOptions);
        if (authResponse?.AccessToken == null)
        {
            throw new HttpRequestException("FedEx authentication failed: No access token received");
        }

        _accessToken = authResponse.AccessToken;
        _tokenExpiry = DateTime.UtcNow.AddSeconds(authResponse.ExpiresIn);
    }

    /// <summary>
    /// Builds a rate request from shipping details.
    /// </summary>
    public FedExRateRequest BuildRateRequest(
        FedExAddress origin,
        FedExAddress destination,
        List<FedExPackageLineItem> packages,
        string? serviceType = null)
    {
        return new FedExRateRequest
        {
            AccountNumber = new FedExAccountNumber { Value = _accountNumber },
            RequestedShipment = new FedExRequestedShipment
            {
                Shipper = new FedExParty { Address = origin },
                Recipient = new FedExParty { Address = destination },
                ServiceType = serviceType,
                RequestedPackageLineItems = packages
            }
        };
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
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
