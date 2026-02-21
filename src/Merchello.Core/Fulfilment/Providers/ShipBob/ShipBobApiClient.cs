using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Merchello.Core.Fulfilment.Providers.ShipBob.Models;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Fulfilment.Providers.ShipBob;

/// <summary>
/// HTTP client for ShipBob REST API (version configured via ShipBobSettings.ApiVersion).
/// Uses Personal Access Token (PAT) authentication.
/// </summary>
public sealed class ShipBobApiClient : IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly bool _ownsHttpClient;
    private readonly ShipBobSettings _settings;
    private readonly ILogger? _logger;
    private bool _disposed;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    /// <summary>
    /// Creates a new ShipBobApiClient with internal HttpClient.
    /// </summary>
    public ShipBobApiClient(ShipBobSettings settings, ILogger? logger = null)
    {
        _settings = settings ?? throw new ArgumentNullException(nameof(settings));
        _logger = logger;
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(settings.ApiBaseUrl.TrimEnd('/')),
            Timeout = TimeSpan.FromSeconds(settings.TimeoutSeconds)
        };
        _ownsHttpClient = true;
        ConfigureHttpClient();
    }

    /// <summary>
    /// Creates a new ShipBobApiClient with provided HttpClient.
    /// </summary>
    public ShipBobApiClient(HttpClient httpClient, ShipBobSettings settings, ILogger? logger = null)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _settings = settings ?? throw new ArgumentNullException(nameof(settings));
        _logger = logger;
        _ownsHttpClient = false;
        ConfigureHttpClient();
    }

    private void ConfigureHttpClient()
    {
        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        if (!string.IsNullOrWhiteSpace(_settings.PersonalAccessToken))
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _settings.PersonalAccessToken);
        }

        if (_settings.ChannelId.HasValue)
        {
            _httpClient.DefaultRequestHeaders.Add("shipbob_channel_id", _settings.ChannelId.Value.ToString());
        }
    }

    #region Orders

    /// <summary>
    /// Creates an order in ShipBob.
    /// </summary>
    public async Task<ShipBobApiResult<ShipBobOrderResponse>> CreateOrderAsync(
        ShipBobOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        var url = $"/{_settings.ApiVersion}/order";
        return await PostAsync<ShipBobOrderRequest, ShipBobOrderResponse>(url, request, cancellationToken);
    }

    /// <summary>
    /// Gets an order by ID.
    /// </summary>
    public async Task<ShipBobApiResult<ShipBobOrderResponse>> GetOrderAsync(
        int orderId,
        CancellationToken cancellationToken = default)
    {
        var url = $"/{_settings.ApiVersion}/order/{orderId}";
        return await GetAsync<ShipBobOrderResponse>(url, cancellationToken);
    }

    /// <summary>
    /// Gets orders by reference IDs.
    /// </summary>
    public async Task<ShipBobApiResult<IReadOnlyList<ShipBobOrderResponse>>> GetOrdersByReferenceIdsAsync(
        IEnumerable<string> referenceIds,
        CancellationToken cancellationToken = default)
    {
        var refIds = string.Join(",", referenceIds);
        var url = $"/{_settings.ApiVersion}/order?ReferenceIds={Uri.EscapeDataString(refIds)}";
        return await GetAsync<IReadOnlyList<ShipBobOrderResponse>>(url, cancellationToken);
    }

    /// <summary>
    /// Cancels a shipment.
    /// </summary>
    public async Task<ShipBobApiResult<bool>> CancelShipmentAsync(
        int shipmentId,
        CancellationToken cancellationToken = default)
    {
        var primaryUrl = $"/{_settings.ApiVersion}/shipment/{shipmentId}:cancel";
        var primary = await PostAsync<object, object>(primaryUrl, new { }, cancellationToken);
        if (primary.Success)
        {
            return new ShipBobApiResult<bool> { Success = true, Data = true };
        }

        if (primary.Error?.StatusCode is not (404 or 405))
        {
            return new ShipBobApiResult<bool>
            {
                Success = false,
                Data = false,
                Error = primary.Error
            };
        }

        var fallbackUrl = $"/{_settings.ApiVersion}/shipment/{shipmentId}/cancel";
        var fallback = await PostAsync<object, object>(fallbackUrl, new { }, cancellationToken);
        return new ShipBobApiResult<bool>
        {
            Success = fallback.Success,
            Data = fallback.Success,
            Error = fallback.Error
        };
    }

    #endregion

    #region Products

    /// <summary>
    /// Creates a product in ShipBob.
    /// </summary>
    public async Task<ShipBobApiResult<ShipBobProductResponse>> CreateProductAsync(
        ShipBobProductRequest request,
        CancellationToken cancellationToken = default)
    {
        var url = $"/{_settings.ApiVersion}/product";
        return await PostAsync<ShipBobProductRequest, ShipBobProductResponse>(url, request, cancellationToken);
    }

    /// <summary>
    /// Updates a product in ShipBob.
    /// </summary>
    public async Task<ShipBobApiResult<ShipBobProductResponse>> UpdateProductAsync(
        long productId,
        ShipBobProductRequest request,
        CancellationToken cancellationToken = default)
    {
        var url = $"/{_settings.ApiVersion}/product/{productId}";
        return await PatchAsync<ShipBobProductRequest, ShipBobProductResponse>(url, request, cancellationToken);
    }

    /// <summary>
    /// Gets a product by ID.
    /// </summary>
    public async Task<ShipBobApiResult<ShipBobProductResponse>> GetProductAsync(
        long productId,
        CancellationToken cancellationToken = default)
    {
        var url = $"/{_settings.ApiVersion}/product/{productId}";
        return await GetAsync<ShipBobProductResponse>(url, cancellationToken);
    }

    /// <summary>
    /// Gets products by SKUs.
    /// </summary>
    public async Task<ShipBobApiResult<IReadOnlyList<ShipBobProductResponse>>> GetProductsBySkusAsync(
        IEnumerable<string> skus,
        CancellationToken cancellationToken = default)
    {
        var skuList = string.Join(",", skus);
        var url = $"/{_settings.ApiVersion}/product?Skus={Uri.EscapeDataString(skuList)}";
        return await GetAsync<IReadOnlyList<ShipBobProductResponse>>(url, cancellationToken);
    }

    #endregion

    #region Inventory

    /// <summary>
    /// Gets inventory levels for all products.
    /// </summary>
    public async Task<ShipBobApiResult<IReadOnlyList<ShipBobInventoryLevelResponse>>> GetInventoryLevelsAsync(
        int pageSize = 250,
        CancellationToken cancellationToken = default)
    {
        var allInventory = new List<ShipBobInventoryLevelResponse>();
        var page = 1;
        bool hasMore;

        do
        {
            var url = $"/{_settings.ApiVersion}/inventory?Page={page}&Limit={pageSize}";
            var result = await GetAsync<IReadOnlyList<ShipBobInventoryLevelResponse>>(url, cancellationToken);

            if (!result.Success || result.Data == null)
            {
                return result;
            }

            allInventory.AddRange(result.Data);
            hasMore = result.Data.Count == pageSize;
            page++;
        }
        while (hasMore);

        return new ShipBobApiResult<IReadOnlyList<ShipBobInventoryLevelResponse>>
        {
            Success = true,
            Data = allInventory
        };
    }

    #endregion

    #region Fulfillment Centers

    /// <summary>
    /// Gets all fulfillment centers.
    /// </summary>
    public async Task<ShipBobApiResult<IReadOnlyList<ShipBobFulfillmentCenter>>> GetFulfillmentCentersAsync(
        CancellationToken cancellationToken = default)
    {
        var url = $"/{_settings.ApiVersion}/fulfillment-center";
        return await GetAsync<IReadOnlyList<ShipBobFulfillmentCenter>>(url, cancellationToken);
    }

    #endregion

    #region Webhooks

    /// <summary>
    /// Creates a webhook subscription.
    /// </summary>
    public async Task<ShipBobApiResult<ShipBobWebhookSubscription>> CreateWebhookSubscriptionAsync(
        string topic,
        string subscriptionUrl,
        CancellationToken cancellationToken = default)
    {
        var url = $"/{_settings.ApiVersion}/webhook";
        var request = new ShipBobWebhookSubscriptionRequest
        {
            Topic = topic,
            SubscriptionUrl = subscriptionUrl
        };
        return await PostAsync<ShipBobWebhookSubscriptionRequest, ShipBobWebhookSubscription>(url, request, cancellationToken);
    }

    /// <summary>
    /// Gets all webhook subscriptions.
    /// </summary>
    public async Task<ShipBobApiResult<IReadOnlyList<ShipBobWebhookSubscription>>> GetWebhookSubscriptionsAsync(
        CancellationToken cancellationToken = default)
    {
        var url = $"/{_settings.ApiVersion}/webhook";
        var result = await GetAsync<ShipBobWebhookSubscriptionsResponse>(url, cancellationToken);

        return new ShipBobApiResult<IReadOnlyList<ShipBobWebhookSubscription>>
        {
            Success = result.Success,
            Data = result.Data?.Webhooks ?? [],
            Error = result.Error
        };
    }

    /// <summary>
    /// Deletes a webhook subscription.
    /// </summary>
    public async Task<ShipBobApiResult<bool>> DeleteWebhookSubscriptionAsync(
        int webhookId,
        CancellationToken cancellationToken = default)
    {
        var url = $"/{_settings.ApiVersion}/webhook/{webhookId}";
        return await DeleteAsync(url, cancellationToken);
    }

    #endregion

    #region HTTP Methods

    private async Task<ShipBobApiResult<TResponse>> GetAsync<TResponse>(
        string url,
        CancellationToken cancellationToken)
    {
        return await SendAsync<TResponse>(HttpMethod.Get, url, null, cancellationToken);
    }

    private async Task<ShipBobApiResult<TResponse>> PostAsync<TRequest, TResponse>(
        string url,
        TRequest request,
        CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(request, JsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        return await SendAsync<TResponse>(HttpMethod.Post, url, content, cancellationToken);
    }

    private async Task<ShipBobApiResult<TResponse>> PatchAsync<TRequest, TResponse>(
        string url,
        TRequest request,
        CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(request, JsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        return await SendAsync<TResponse>(HttpMethod.Patch, url, content, cancellationToken);
    }

    private async Task<ShipBobApiResult<bool>> DeleteAsync(
        string url,
        CancellationToken cancellationToken)
    {
        var result = await SendAsync<object>(HttpMethod.Delete, url, null, cancellationToken);
        return new ShipBobApiResult<bool>
        {
            Success = result.Success,
            Data = result.Success,
            Error = result.Error
        };
    }

    private async Task<ShipBobApiResult<TResponse>> SendAsync<TResponse>(
        HttpMethod method,
        string url,
        HttpContent? content,
        CancellationToken cancellationToken)
    {
        var requestId = Guid.NewGuid().ToString("N")[..8];

        try
        {
            if (_settings.EnableDebugLogging)
            {
                _logger?.LogDebug("[ShipBob:{RequestId}] {Method} {Url}", requestId, method, url);
                if (content != null)
                {
                    var body = await content.ReadAsStringAsync(cancellationToken);
                    _logger?.LogDebug("[ShipBob:{RequestId}] Request body: {Body}", requestId, body);
                }
            }

            using var request = new HttpRequestMessage(method, url);
            request.Content = content;

            using var response = await _httpClient.SendAsync(request, cancellationToken);

            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (_settings.EnableDebugLogging)
            {
                _logger?.LogDebug("[ShipBob:{RequestId}] Response {StatusCode}: {Body}",
                    requestId, (int)response.StatusCode, responseBody);
            }

            if (response.IsSuccessStatusCode)
            {
                if (string.IsNullOrWhiteSpace(responseBody))
                {
                    return new ShipBobApiResult<TResponse> { Success = true };
                }

                var data = JsonSerializer.Deserialize<TResponse>(responseBody, JsonOptions);
                return new ShipBobApiResult<TResponse>
                {
                    Success = true,
                    Data = data
                };
            }

            // Parse error response
            var error = ParseError(response, responseBody);
            _logger?.LogWarning("[ShipBob:{RequestId}] API error: {Error}", requestId, error.GetDisplayMessage());

            return new ShipBobApiResult<TResponse>
            {
                Success = false,
                Error = error
            };
        }
        catch (HttpRequestException ex)
        {
            _logger?.LogError(ex, "[ShipBob:{RequestId}] HTTP error", requestId);
            return new ShipBobApiResult<TResponse>
            {
                Success = false,
                Error = new ShipBobApiError
                {
                    StatusCode = 0,
                    Message = ex.Message,
                    Type = "HttpRequestException"
                }
            };
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger?.LogError(ex, "[ShipBob:{RequestId}] Request timeout", requestId);
            return new ShipBobApiResult<TResponse>
            {
                Success = false,
                Error = new ShipBobApiError
                {
                    StatusCode = 0,
                    Message = "Request timed out",
                    Type = "Timeout"
                }
            };
        }
        catch (JsonException ex)
        {
            _logger?.LogError(ex, "[ShipBob:{RequestId}] JSON parsing error", requestId);
            return new ShipBobApiResult<TResponse>
            {
                Success = false,
                Error = new ShipBobApiError
                {
                    StatusCode = 0,
                    Message = $"Failed to parse response: {ex.Message}",
                    Type = "JsonException"
                }
            };
        }
    }

    private static ShipBobApiError ParseError(HttpResponseMessage response, string responseBody)
    {
        TimeSpan? retryAfter = null;
        if (response.StatusCode == HttpStatusCode.TooManyRequests &&
            response.Headers.RetryAfter?.Delta != null)
        {
            retryAfter = response.Headers.RetryAfter.Delta;
        }

        try
        {
            var errorResponse = JsonSerializer.Deserialize<ShipBobErrorResponse>(responseBody, JsonOptions);
            return new ShipBobApiError
            {
                StatusCode = (int)response.StatusCode,
                Message = errorResponse?.Message ?? response.ReasonPhrase,
                Type = errorResponse?.Type,
                ValidationErrors = errorResponse?.Errors ?? [],
                RetryAfter = retryAfter
            };
        }
        catch
        {
            return new ShipBobApiError
            {
                StatusCode = (int)response.StatusCode,
                Message = string.IsNullOrWhiteSpace(responseBody) ? response.ReasonPhrase : responseBody,
                RetryAfter = retryAfter
            };
        }
    }

    #endregion

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        if (_ownsHttpClient)
        {
            _httpClient.Dispose();
        }

        _disposed = true;
    }
}
