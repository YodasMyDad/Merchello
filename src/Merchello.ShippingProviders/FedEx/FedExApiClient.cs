using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Merchello.ShippingProviders.FedEx.Models;

namespace Merchello.ShippingProviders.FedEx;

/// <summary>
/// HTTP client for FedEx REST API with OAuth2 authentication.
/// </summary>
public class FedExApiClient : IDisposable
{
    private const string ProductionBaseUrl = "https://api.fedex.com";
    private const string SandboxBaseUrl = "https://apis-sandbox.fedex.com";

    private readonly HttpClient _httpClient;
    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly string _accountNumber;
    private readonly bool _useSandbox;

    private string? _accessToken;
    private DateTime _tokenExpiry = DateTime.MinValue;
    private readonly SemaphoreSlim _tokenLock = new(1, 1);

    /// <summary>
    /// Creates a new FedEx API client.
    /// </summary>
    /// <param name="httpClient">HTTP client instance.</param>
    /// <param name="clientId">FedEx API Key (Client ID).</param>
    /// <param name="clientSecret">FedEx Secret Key (Client Secret).</param>
    /// <param name="accountNumber">FedEx Account Number.</param>
    /// <param name="useSandbox">Whether to use sandbox environment.</param>
    public FedExApiClient(
        HttpClient httpClient,
        string clientId,
        string clientSecret,
        string accountNumber,
        bool useSandbox = true)
    {
        _httpClient = httpClient;
        _clientId = clientId;
        _clientSecret = clientSecret;
        _accountNumber = accountNumber;
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
            catch
            {
                // Fall through to generic error
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

        var formData = new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["client_id"] = _clientId,
            ["client_secret"] = _clientSecret
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new FormUrlEncodedContent(formData)
        };

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
        }

        _disposed = true;
    }
}
