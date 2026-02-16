using System.Diagnostics;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Merchello.Core.Shared.Security;
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
    public async Task<OutboundDeliveryResult> SendAsync(
        OutboundDelivery delivery,
        WebhookSubscription subscription,
        CancellationToken ct = default)
    {
        if (!UrlSecurityValidator.TryValidatePublicHttpUrl(
                subscription.TargetUrl,
                requireHttps: false,
                out _,
                out var urlError))
        {
            logger.LogWarning(
                "Blocked webhook delivery {DeliveryId} to disallowed URL {Url}: {Reason}",
                delivery.Id,
                subscription.TargetUrl,
                urlError);

            return new OutboundDeliveryResult
            {
                Success = false,
                ErrorMessage = $"Target URL is not allowed: {urlError}"
            };
        }

        var client = httpClientFactory.CreateClient("Webhooks");
        var timeoutSeconds = Math.Max(1, subscription.TimeoutSeconds);
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

        using var request = new HttpRequestMessage(HttpMethod.Post, subscription.TargetUrl);

        if (subscription.Format == WebhookFormat.Json)
        {
            request.Content = new StringContent(delivery.RequestBody ?? string.Empty, Encoding.UTF8, "application/json");
        }
        else
        {
            // Form URL encoded
            if (!string.IsNullOrEmpty(delivery.RequestBody))
            {
                var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(delivery.RequestBody);
                if (dict != null)
                {
                    var formContent = new FormUrlEncodedContent(
                        dict.Select(kvp => new KeyValuePair<string, string>(kvp.Key, kvp.Value?.ToString() ?? "")));
                    request.Content = formContent;
                }
            }
        }

        // Add standard headers
        request.Headers.Add("X-Merchello-Topic", delivery.Topic);
        request.Headers.Add("X-Merchello-Delivery-Id", delivery.Id.ToString());
        request.Headers.Add("X-Merchello-Timestamp", DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString());
        request.Headers.Add("User-Agent", "Merchello-Webhooks/1.0");

        // Add signature
        AddSignature(request, delivery.RequestBody ?? string.Empty, subscription);

        // Add custom headers
        foreach (var header in subscription.Headers)
        {
            request.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        var stopwatch = Stopwatch.StartNew();

        try
        {
            logger.LogDebug("Sending webhook to {Url} for topic {Topic}", subscription.TargetUrl, delivery.Topic);

            using var response = await client.SendAsync(request, timeoutCts.Token);
            stopwatch.Stop();

            var responseBody = await response.Content.ReadAsStringAsync(timeoutCts.Token);
            var responseHeadersJson = SerializeHeaders(response.Headers);

            logger.LogDebug(
                "Webhook response from {Url}: {StatusCode} in {Duration}ms",
                subscription.TargetUrl,
                (int)response.StatusCode,
                stopwatch.ElapsedMilliseconds);

            return new OutboundDeliveryResult
            {
                Success = response.IsSuccessStatusCode,
                StatusCode = (int)response.StatusCode,
                ResponseBody = responseBody,
                ResponseHeaders = responseHeadersJson,
                DurationMs = (int)stopwatch.ElapsedMilliseconds
            };
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            stopwatch.Stop();
            logger.LogDebug("Webhook delivery to {Url} was canceled after {Duration}ms", subscription.TargetUrl, stopwatch.ElapsedMilliseconds);

            return new OutboundDeliveryResult
            {
                Success = false,
                ErrorMessage = "Request canceled",
                DurationMs = (int)stopwatch.ElapsedMilliseconds
            };
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            stopwatch.Stop();
            logger.LogWarning("Webhook to {Url} timed out after {Duration}ms", subscription.TargetUrl, stopwatch.ElapsedMilliseconds);

            return new OutboundDeliveryResult
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

            return new OutboundDeliveryResult
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

            return new OutboundDeliveryResult
            {
                Success = false,
                ErrorMessage = ex.Message,
                DurationMs = (int)stopwatch.ElapsedMilliseconds
            };
        }
    }

    public async Task<OutboundDeliveryResult> PingAsync(string url, CancellationToken ct = default)
    {
        if (!UrlSecurityValidator.TryValidatePublicHttpUrl(url, requireHttps: false, out _, out var urlError))
        {
            return new OutboundDeliveryResult
            {
                Success = false,
                ErrorMessage = $"Target URL is not allowed: {urlError}"
            };
        }

        var client = httpClientFactory.CreateClient("Webhooks");
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(10));

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Content = new StringContent(
            JsonSerializer.Serialize(new { ping = true, timestamp = DateTime.UtcNow }),
            Encoding.UTF8,
            "application/json");

        request.Headers.Add("X-Merchello-Topic", "ping");
        request.Headers.Add("User-Agent", "Merchello-Webhooks/1.0");

        var stopwatch = Stopwatch.StartNew();

        try
        {
            using var response = await client.SendAsync(request, timeoutCts.Token);
            stopwatch.Stop();

            var responseBody = await response.Content.ReadAsStringAsync(timeoutCts.Token);

            return new OutboundDeliveryResult
            {
                Success = response.IsSuccessStatusCode,
                StatusCode = (int)response.StatusCode,
                ResponseBody = responseBody,
                DurationMs = (int)stopwatch.ElapsedMilliseconds
            };
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            stopwatch.Stop();
            return new OutboundDeliveryResult
            {
                Success = false,
                ErrorMessage = "Request canceled",
                DurationMs = (int)stopwatch.ElapsedMilliseconds
            };
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            stopwatch.Stop();
            return new OutboundDeliveryResult
            {
                Success = false,
                ErrorMessage = "Request timed out",
                DurationMs = (int)stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return new OutboundDeliveryResult
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
