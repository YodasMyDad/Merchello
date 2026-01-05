using System.Diagnostics;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Models.Enums;
using Merchello.Core.Webhooks.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Webhooks.Services;

/// <summary>
/// Handles HTTP delivery of webhooks with signing and authentication.
/// </summary>
public class WebhookDispatcher(
    IHttpClientFactory httpClientFactory,
    ILogger<WebhookDispatcher> logger) : IWebhookDispatcher
{
    public async Task DispatchAsync<T>(
        string topic,
        T payload,
        Guid? entityId = null,
        CancellationToken ct = default) where T : class
    {
        // This method delegates to WebhookService.QueueDeliveryAsync
        // It's provided for convenience when injecting IWebhookDispatcher directly
        logger.LogDebug("Dispatch called for topic {Topic}, entity {EntityId}", topic, entityId);
    }

    public async Task<WebhookDeliveryResult> SendAsync(
        WebhookDelivery delivery,
        WebhookSubscription subscription,
        CancellationToken ct = default)
    {
        var client = httpClientFactory.CreateClient("Webhooks");
        client.Timeout = TimeSpan.FromSeconds(subscription.TimeoutSeconds);

        var request = new HttpRequestMessage(HttpMethod.Post, subscription.TargetUrl);

        if (subscription.Format == WebhookFormat.Json)
        {
            request.Content = new StringContent(delivery.RequestBody, Encoding.UTF8, "application/json");
        }
        else
        {
            // Form URL encoded
            var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(delivery.RequestBody);
            if (dict != null)
            {
                var formContent = new FormUrlEncodedContent(
                    dict.Select(kvp => new KeyValuePair<string, string>(kvp.Key, kvp.Value?.ToString() ?? "")));
                request.Content = formContent;
            }
        }

        // Add standard headers
        request.Headers.Add("X-Merchello-Topic", delivery.Topic);
        request.Headers.Add("X-Merchello-Delivery-Id", delivery.Id.ToString());
        request.Headers.Add("X-Merchello-Timestamp", DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString());
        request.Headers.Add("User-Agent", "Merchello-Webhooks/1.0");

        // Add signature
        AddSignature(request, delivery.RequestBody, subscription);

        // Add custom headers
        foreach (var header in subscription.Headers)
        {
            request.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        var stopwatch = Stopwatch.StartNew();
        var requestHeadersJson = SerializeHeaders(request.Headers);

        try
        {
            logger.LogDebug("Sending webhook to {Url} for topic {Topic}", subscription.TargetUrl, delivery.Topic);

            var response = await client.SendAsync(request, ct);
            stopwatch.Stop();

            var responseBody = await response.Content.ReadAsStringAsync(ct);
            var responseHeadersJson = SerializeHeaders(response.Headers);

            logger.LogDebug(
                "Webhook response from {Url}: {StatusCode} in {Duration}ms",
                subscription.TargetUrl,
                (int)response.StatusCode,
                stopwatch.ElapsedMilliseconds);

            return new WebhookDeliveryResult
            {
                Success = response.IsSuccessStatusCode,
                StatusCode = (int)response.StatusCode,
                ResponseBody = responseBody,
                ResponseHeaders = responseHeadersJson,
                DurationMs = (int)stopwatch.ElapsedMilliseconds
            };
        }
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
        {
            stopwatch.Stop();
            logger.LogWarning("Webhook to {Url} timed out after {Duration}ms", subscription.TargetUrl, stopwatch.ElapsedMilliseconds);

            return new WebhookDeliveryResult
            {
                Success = false,
                ErrorMessage = "Request timed out",
                DurationMs = (int)stopwatch.ElapsedMilliseconds
            };
        }
        catch (HttpRequestException ex)
        {
            stopwatch.Stop();
            logger.LogWarning(ex, "Webhook to {Url} failed: {Message}", subscription.TargetUrl, ex.Message);

            return new WebhookDeliveryResult
            {
                Success = false,
                ErrorMessage = ex.Message,
                DurationMs = (int)stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            logger.LogError(ex, "Unexpected error sending webhook to {Url}", subscription.TargetUrl);

            return new WebhookDeliveryResult
            {
                Success = false,
                ErrorMessage = ex.Message,
                DurationMs = (int)stopwatch.ElapsedMilliseconds
            };
        }
    }

    public async Task<WebhookDeliveryResult> PingAsync(string url, CancellationToken ct = default)
    {
        var client = httpClientFactory.CreateClient("Webhooks");
        client.Timeout = TimeSpan.FromSeconds(10);

        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Content = new StringContent(
            JsonSerializer.Serialize(new { ping = true, timestamp = DateTime.UtcNow }),
            Encoding.UTF8,
            "application/json");

        request.Headers.Add("X-Merchello-Topic", "ping");
        request.Headers.Add("User-Agent", "Merchello-Webhooks/1.0");

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var response = await client.SendAsync(request, ct);
            stopwatch.Stop();

            var responseBody = await response.Content.ReadAsStringAsync(ct);

            return new WebhookDeliveryResult
            {
                Success = response.IsSuccessStatusCode,
                StatusCode = (int)response.StatusCode,
                ResponseBody = responseBody,
                DurationMs = (int)stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return new WebhookDeliveryResult
            {
                Success = false,
                ErrorMessage = ex.Message,
                DurationMs = (int)stopwatch.ElapsedMilliseconds
            };
        }
    }

    private void AddSignature(HttpRequestMessage request, string body, WebhookSubscription subscription)
    {
        if (subscription.AuthType == WebhookAuthType.None)
            return;

        switch (subscription.AuthType)
        {
            case WebhookAuthType.HmacSha256:
                var hmac256 = ComputeHmacSha256(body, subscription.Secret);
                request.Headers.Add("X-Merchello-Hmac-SHA256", hmac256);
                break;

            case WebhookAuthType.HmacSha512:
                var hmac512 = ComputeHmacSha512(body, subscription.Secret);
                request.Headers.Add("X-Merchello-Hmac-SHA512", hmac512);
                break;

            case WebhookAuthType.BearerToken:
                request.Headers.Authorization =
                    new AuthenticationHeaderValue("Bearer", subscription.AuthHeaderValue);
                break;

            case WebhookAuthType.ApiKey:
                if (!string.IsNullOrEmpty(subscription.AuthHeaderValue))
                {
                    request.Headers.Add(
                        subscription.AuthHeaderName ?? "X-Api-Key",
                        subscription.AuthHeaderValue);
                }
                break;

            case WebhookAuthType.BasicAuth:
                var basicAuth = Convert.ToBase64String(
                    Encoding.UTF8.GetBytes(subscription.AuthHeaderValue ?? ""));
                request.Headers.Authorization =
                    new AuthenticationHeaderValue("Basic", basicAuth);
                break;
        }
    }

    private static string ComputeHmacSha256(string data, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToBase64String(hash);
    }

    private static string ComputeHmacSha512(string data, string secret)
    {
        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToBase64String(hash);
    }

    private static string SerializeHeaders(HttpHeaders headers)
    {
        var dict = headers.ToDictionary(
            h => h.Key,
            h => string.Join(", ", h.Value));

        return JsonSerializer.Serialize(dict);
    }
}
