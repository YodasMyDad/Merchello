using System.Security.Cryptography;
using System.Text.Json;
using Merchello.Core.Data;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Webhooks.Dtos;
using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Services.Interfaces;
using Merchello.Core.Webhooks.Services.Parameters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Webhooks.Services;

/// <summary>
/// Service for managing webhook subscriptions and deliveries.
/// </summary>
public class WebhookService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IWebhookTopicRegistry topicRegistry,
    IWebhookDispatcher dispatcher,
    IOptions<WebhookSettings> options,
    ILogger<WebhookService> logger) : IWebhookService
{
    private readonly WebhookSettings _settings = options.Value;

    #region Subscriptions

    public async Task<CrudResult<WebhookSubscription>> CreateSubscriptionAsync(
        CreateWebhookSubscriptionParameters parameters,
        CancellationToken ct = default)
    {
        var result = new CrudResult<WebhookSubscription>();

        // Validate required fields
        if (string.IsNullOrWhiteSpace(parameters.Name))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Name is required." });
            return result;
        }

        if (string.IsNullOrWhiteSpace(parameters.Topic))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Topic is required." });
            return result;
        }

        if (string.IsNullOrWhiteSpace(parameters.TargetUrl))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Target URL is required." });
            return result;
        }

        // Validate URL format
        if (!Uri.TryCreate(parameters.TargetUrl, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Target URL must be a valid HTTP or HTTPS URL." });
            return result;
        }

        // Validate topic exists
        var topics = await GetAvailableTopicsAsync(ct);
        if (!topics.Any(t => t.Key == parameters.Topic))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = $"Invalid topic: {parameters.Topic}" });
            return result;
        }

        var subscription = new WebhookSubscription
        {
            Id = GuidExtensions.NewSequentialGuid,
            Name = parameters.Name,
            Topic = parameters.Topic,
            TargetUrl = parameters.TargetUrl,
            Secret = GenerateSecret(),
            AuthType = parameters.AuthType,
            AuthHeaderName = parameters.AuthHeaderName,
            AuthHeaderValue = parameters.AuthHeaderValue,
            TimeoutSeconds = parameters.TimeoutSeconds > 0 ? parameters.TimeoutSeconds : _settings.DefaultTimeoutSeconds,
            FilterExpression = parameters.FilterExpression,
            Headers = parameters.Headers,
            IsActive = true,
            DateCreated = DateTime.UtcNow,
            DateUpdated = DateTime.UtcNow
        };

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.WebhookSubscriptions.Add(subscription);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        logger.LogInformation("Created webhook subscription {SubscriptionId} for topic {Topic}", subscription.Id, subscription.Topic);

        result.ResultObject = subscription;
        return result;
    }

    public async Task<CrudResult<WebhookSubscription>> UpdateSubscriptionAsync(
        UpdateWebhookSubscriptionParameters parameters,
        CancellationToken ct = default)
    {
        var result = new CrudResult<WebhookSubscription>();

        using var scope = efCoreScopeProvider.CreateScope();
        var subscription = await scope.ExecuteWithContextAsync(async db =>
            await db.WebhookSubscriptions.FirstOrDefaultAsync(s => s.Id == parameters.Id, ct));

        if (subscription == null)
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Subscription not found." });
            return result;
        }

        // Validate URL if provided
        if (!string.IsNullOrWhiteSpace(parameters.TargetUrl))
        {
            if (!Uri.TryCreate(parameters.TargetUrl, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Target URL must be a valid HTTP or HTTPS URL." });
                return result;
            }
            subscription.TargetUrl = parameters.TargetUrl;
        }

        if (parameters.Name != null) subscription.Name = parameters.Name;
        if (parameters.IsActive.HasValue) subscription.IsActive = parameters.IsActive.Value;
        if (parameters.AuthType.HasValue) subscription.AuthType = parameters.AuthType.Value;
        if (parameters.AuthHeaderName != null) subscription.AuthHeaderName = parameters.AuthHeaderName;
        if (parameters.AuthHeaderValue != null) subscription.AuthHeaderValue = parameters.AuthHeaderValue;
        if (parameters.TimeoutSeconds.HasValue) subscription.TimeoutSeconds = parameters.TimeoutSeconds.Value;
        if (parameters.FilterExpression != null) subscription.FilterExpression = parameters.FilterExpression;
        if (parameters.Headers != null) subscription.Headers = parameters.Headers;

        subscription.DateUpdated = DateTime.UtcNow;

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.WebhookSubscriptions.Update(subscription);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        logger.LogInformation("Updated webhook subscription {SubscriptionId}", subscription.Id);

        result.ResultObject = subscription;
        return result;
    }

    public async Task<bool> DeleteSubscriptionAsync(Guid subscriptionId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var deleted = await scope.ExecuteWithContextAsync(async db =>
        {
            var subscription = await db.WebhookSubscriptions.FirstOrDefaultAsync(s => s.Id == subscriptionId, ct);
            if (subscription == null) return false;

            db.WebhookSubscriptions.Remove(subscription);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        if (deleted)
        {
            logger.LogInformation("Deleted webhook subscription {SubscriptionId}", subscriptionId);
        }

        return deleted;
    }

    public async Task<WebhookSubscription?> GetSubscriptionAsync(Guid id, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var subscription = await scope.ExecuteWithContextAsync(async db =>
            await db.WebhookSubscriptions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct));
        scope.Complete();
        return subscription;
    }

    public async Task<PaginatedList<WebhookSubscription>> QuerySubscriptionsAsync(
        WebhookSubscriptionQueryParameters parameters,
        CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.WebhookSubscriptions.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(parameters.Topic))
                query = query.Where(s => s.Topic == parameters.Topic);

            if (parameters.IsActive.HasValue)
                query = query.Where(s => s.IsActive == parameters.IsActive.Value);

            if (!string.IsNullOrWhiteSpace(parameters.SearchTerm))
            {
                var term = parameters.SearchTerm.ToLower();
                query = query.Where(s => s.Name.ToLower().Contains(term) || s.TargetUrl.ToLower().Contains(term));
            }

            var totalCount = await query.CountAsync(ct);

            query = parameters.SortBy?.ToLower() switch
            {
                "name" => parameters.SortDirection?.ToLower() == "desc"
                    ? query.OrderByDescending(s => s.Name)
                    : query.OrderBy(s => s.Name),
                "topic" => parameters.SortDirection?.ToLower() == "desc"
                    ? query.OrderByDescending(s => s.Topic)
                    : query.OrderBy(s => s.Topic),
                _ => query.OrderByDescending(s => s.DateCreated)
            };

            var items = await query
                .Skip((parameters.Page - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .ToListAsync(ct);

            return new PaginatedList<WebhookSubscription>(items, totalCount, parameters.Page, parameters.PageSize);
        });
        scope.Complete();
        return result;
    }

    public async Task<IEnumerable<WebhookSubscription>> GetSubscriptionsForTopicAsync(
        string topic,
        CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var subscriptions = await scope.ExecuteWithContextAsync(async db =>
            await db.WebhookSubscriptions
                .AsNoTracking()
                .Where(s => s.Topic == topic && s.IsActive)
                .ToListAsync(ct));
        scope.Complete();
        return subscriptions;
    }

    #endregion

    #region Topics

    public Task<IEnumerable<WebhookTopic>> GetAvailableTopicsAsync(CancellationToken ct = default)
    {
        return Task.FromResult(topicRegistry.GetAllTopics());
    }

    public Task<IEnumerable<WebhookTopicCategoryDto>> GetTopicsByCategoryAsync(CancellationToken ct = default)
    {
        var topics = topicRegistry.GetAllTopics();
        var categories = topics
            .GroupBy(t => t.Category)
            .Select(g => new WebhookTopicCategoryDto
            {
                Name = g.Key,
                Topics = g.Select(t => new WebhookTopicDto
                {
                    Key = t.Key,
                    DisplayName = t.DisplayName,
                    Description = t.Description,
                    Category = t.Category,
                    SamplePayload = t.SamplePayload
                }).ToList()
            })
            .OrderBy(c => c.Name);

        return Task.FromResult<IEnumerable<WebhookTopicCategoryDto>>(categories);
    }

    #endregion

    #region Delivery

    public async Task<Guid> QueueDeliveryAsync(
        string topic,
        object payload,
        Guid? entityId = null,
        string? entityType = null,
        CancellationToken ct = default)
    {
        var subscriptions = await GetSubscriptionsForTopicAsync(topic, ct);
        var deliveryIds = new List<Guid>();

        foreach (var subscription in subscriptions)
        {
            var envelope = new
            {
                id = GuidExtensions.NewSequentialGuid,
                topic,
                timestamp = DateTime.UtcNow,
                api_version = subscription.ApiVersion ?? "2024-01",
                data = payload
            };

            var requestBody = JsonSerializer.Serialize(envelope, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });

            var delivery = new OutboundDelivery
            {
                Id = GuidExtensions.NewSequentialGuid,
                DeliveryType = OutboundDeliveryType.Webhook,
                ConfigurationId = subscription.Id,
                Topic = topic,
                EntityId = entityId,
                EntityType = entityType,
                TargetUrl = subscription.TargetUrl,
                RequestBody = requestBody,
                RequestHeaders = "{}",
                Status = OutboundDeliveryStatus.Pending,
                DateCreated = DateTime.UtcNow
            };

            using var scope = efCoreScopeProvider.CreateScope();
            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                db.OutboundDeliveries.Add(delivery);

                // Update subscription stats
                var sub = await db.WebhookSubscriptions.FirstAsync(s => s.Id == subscription.Id, ct);
                sub.LastTriggeredUtc = DateTime.UtcNow;
                sub.DateUpdated = DateTime.UtcNow;

                await db.SaveChangesAsync(ct);
                return true;
            });
            scope.Complete();

            deliveryIds.Add(delivery.Id);

            // Attempt immediate delivery - failures are logged and will be retried by OutboundDeliveryJob
            try
            {
                await DeliverAsync(delivery.Id, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Immediate webhook delivery failed for {DeliveryId}, will be retried by background job", delivery.Id);
            }
        }

        return deliveryIds.FirstOrDefault();
    }

    public async Task<OutboundDeliveryResult> DeliverAsync(Guid deliveryId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();

        var delivery = await scope.ExecuteWithContextAsync(async db =>
            await db.OutboundDeliveries
                .Include(d => d.Subscription)
                .FirstOrDefaultAsync(d => d.Id == deliveryId, ct));

        if (delivery == null || delivery.Subscription == null)
        {
            return new OutboundDeliveryResult
            {
                Success = false,
                ErrorMessage = "Delivery or subscription not found"
            };
        }

        var result = await dispatcher.SendAsync(delivery, delivery.Subscription, ct);

        // Update delivery record
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var del = await db.OutboundDeliveries.FirstAsync(d => d.Id == deliveryId, ct);
            var sub = await db.WebhookSubscriptions.FirstAsync(s => s.Id == delivery.ConfigurationId, ct);

            del.DateSent = DateTime.UtcNow;
            del.DurationMs = result.DurationMs;
            del.ResponseStatusCode = result.StatusCode;
            del.ResponseBody = result.ResponseBody?.Length > 10000
                ? result.ResponseBody[..10000]
                : result.ResponseBody;
            del.ResponseHeaders = result.ResponseHeaders;
            del.ErrorMessage = result.ErrorMessage;

            if (result.Success)
            {
                del.Status = OutboundDeliveryStatus.Succeeded;
                del.DateCompleted = DateTime.UtcNow;
                sub.SuccessCount++;
                sub.LastSuccessUtc = DateTime.UtcNow;
                sub.LastErrorMessage = null;
            }
            else
            {
                if (del.AttemptNumber < _settings.MaxRetries)
                {
                    del.Status = OutboundDeliveryStatus.Retrying;
                    del.AttemptNumber++;
                    var delayIndex = Math.Min(del.AttemptNumber - 1, _settings.RetryDelaysSeconds.Length - 1);
                    del.NextRetryUtc = DateTime.UtcNow.AddSeconds(_settings.RetryDelaysSeconds[delayIndex]);
                }
                else
                {
                    del.Status = OutboundDeliveryStatus.Abandoned;
                    del.DateCompleted = DateTime.UtcNow;
                }

                sub.FailureCount++;
                sub.LastFailureUtc = DateTime.UtcNow;
                sub.LastErrorMessage = result.ErrorMessage;
            }

            sub.DateUpdated = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        result.DeliveryId = deliveryId;
        return result;
    }

    public async Task<OutboundDelivery?> GetDeliveryAsync(Guid id, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var delivery = await scope.ExecuteWithContextAsync(async db =>
            await db.OutboundDeliveries.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id, ct));
        scope.Complete();
        return delivery;
    }

    public async Task<PaginatedList<OutboundDelivery>> QueryDeliveriesAsync(
        OutboundDeliveryQueryParameters parameters,
        CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.OutboundDeliveries.AsNoTracking().AsQueryable();

            if (parameters.ConfigurationId.HasValue)
                query = query.Where(d => d.ConfigurationId == parameters.ConfigurationId.Value);

            if (!string.IsNullOrWhiteSpace(parameters.Topic))
                query = query.Where(d => d.Topic == parameters.Topic);

            if (parameters.Status.HasValue)
                query = query.Where(d => d.Status == parameters.Status.Value);

            if (parameters.EntityId.HasValue)
                query = query.Where(d => d.EntityId == parameters.EntityId.Value);

            if (parameters.DeliveryType.HasValue)
                query = query.Where(d => d.DeliveryType == parameters.DeliveryType.Value);

            if (parameters.FromDate.HasValue)
                query = query.Where(d => d.DateCreated >= parameters.FromDate.Value);

            if (parameters.ToDate.HasValue)
                query = query.Where(d => d.DateCreated <= parameters.ToDate.Value);

            var totalCount = await query.CountAsync(ct);

            query = parameters.SortBy?.ToLower() switch
            {
                "status" => parameters.SortDirection?.ToLower() == "desc"
                    ? query.OrderByDescending(d => d.Status)
                    : query.OrderBy(d => d.Status),
                "topic" => parameters.SortDirection?.ToLower() == "desc"
                    ? query.OrderByDescending(d => d.Topic)
                    : query.OrderBy(d => d.Topic),
                _ => query.OrderByDescending(d => d.DateCreated)
            };

            var items = await query
                .Skip((parameters.Page - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .ToListAsync(ct);

            return new PaginatedList<OutboundDelivery>(items, totalCount, parameters.Page, parameters.PageSize);
        });
        scope.Complete();
        return result;
    }

    public async Task<IEnumerable<OutboundDelivery>> GetRecentDeliveriesAsync(
        Guid subscriptionId,
        int count = 10,
        CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var deliveries = await scope.ExecuteWithContextAsync(async db =>
            await db.OutboundDeliveries
                .AsNoTracking()
                .Where(d => d.ConfigurationId == subscriptionId)
                .OrderByDescending(d => d.DateCreated)
                .Take(count)
                .ToListAsync(ct));
        scope.Complete();
        return deliveries;
    }

    #endregion

    #region Testing

    public async Task<OutboundDeliveryResult> SendTestAsync(Guid subscriptionId, CancellationToken ct = default)
    {
        var subscription = await GetSubscriptionAsync(subscriptionId, ct);
        if (subscription == null)
        {
            return new OutboundDeliveryResult
            {
                Success = false,
                ErrorMessage = "Subscription not found"
            };
        }

        var testPayload = new
        {
            id = GuidExtensions.NewSequentialGuid,
            topic = Constants.WebhookTopics.TestPing,
            timestamp = DateTime.UtcNow,
            api_version = subscription.ApiVersion ?? "2024-01",
            data = new
            {
                message = "This is a test webhook from Merchello",
                subscriptionId = subscription.Id,
                subscriptionName = subscription.Name
            }
        };

        var delivery = new OutboundDelivery
        {
            Id = GuidExtensions.NewSequentialGuid,
            DeliveryType = OutboundDeliveryType.Webhook,
            ConfigurationId = subscription.Id,
            Topic = Constants.WebhookTopics.TestPing,
            TargetUrl = subscription.TargetUrl,
            RequestBody = JsonSerializer.Serialize(testPayload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }),
            RequestHeaders = "{}",
            Status = OutboundDeliveryStatus.Pending,
            DateCreated = DateTime.UtcNow
        };

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.OutboundDeliveries.Add(delivery);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        return await DeliverAsync(delivery.Id, ct);
    }

    public async Task<OutboundDeliveryResult> PingAsync(string url, CancellationToken ct = default)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            return new OutboundDeliveryResult
            {
                Success = false,
                ErrorMessage = "Invalid URL"
            };
        }

        return await dispatcher.PingAsync(url, ct);
    }

    #endregion

    #region Retry

    public async Task RetryDeliveryAsync(Guid deliveryId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var delivery = await db.OutboundDeliveries.FirstOrDefaultAsync(d => d.Id == deliveryId, ct);
            if (delivery == null) return false;

            delivery.Status = OutboundDeliveryStatus.Pending;
            delivery.NextRetryUtc = null;
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        await DeliverAsync(deliveryId, ct);
    }

    public async Task ProcessPendingRetriesAsync(CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var pendingDeliveries = await scope.ExecuteWithContextAsync(async db =>
            await db.OutboundDeliveries
                .Where(d => d.DeliveryType == OutboundDeliveryType.Webhook &&
                            d.Status == OutboundDeliveryStatus.Retrying &&
                            d.NextRetryUtc != null &&
                            d.NextRetryUtc <= DateTime.UtcNow)
                .OrderBy(d => d.NextRetryUtc)
                .Take(100)
                .Select(d => d.Id)
                .ToListAsync(ct));
        scope.Complete();

        foreach (var deliveryId in pendingDeliveries)
        {
            try
            {
                await DeliverAsync(deliveryId, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error retrying webhook delivery {DeliveryId}", deliveryId);
            }
        }
    }

    #endregion

    #region Statistics

    public async Task<WebhookStatsDto> GetStatsAsync(
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var stats = await scope.ExecuteWithContextAsync(async db =>
        {
            var subscriptionQuery = db.WebhookSubscriptions.AsNoTracking();
            var deliveryQuery = db.OutboundDeliveries.AsNoTracking()
                .Where(d => d.DeliveryType == OutboundDeliveryType.Webhook);

            if (from.HasValue)
                deliveryQuery = deliveryQuery.Where(d => d.DateCreated >= from.Value);

            if (to.HasValue)
                deliveryQuery = deliveryQuery.Where(d => d.DateCreated <= to.Value);

            var totalSubscriptions = await subscriptionQuery.CountAsync(ct);
            var activeSubscriptions = await subscriptionQuery.CountAsync(s => s.IsActive, ct);

            var deliveryStats = await deliveryQuery
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Total = g.Count(),
                    Succeeded = g.Count(d => d.Status == OutboundDeliveryStatus.Succeeded),
                    Failed = g.Count(d => d.Status == OutboundDeliveryStatus.Failed),
                    Pending = g.Count(d => d.Status == OutboundDeliveryStatus.Pending || d.Status == OutboundDeliveryStatus.Retrying),
                    Abandoned = g.Count(d => d.Status == OutboundDeliveryStatus.Abandoned),
                    AvgDuration = g.Average(d => (double?)d.DurationMs) ?? 0
                })
                .FirstOrDefaultAsync(ct);

            var lastDelivery = await deliveryQuery
                .OrderByDescending(d => d.DateCreated)
                .Select(d => d.DateCreated)
                .FirstOrDefaultAsync(ct);

            return new WebhookStatsDto
            {
                TotalSubscriptions = totalSubscriptions,
                ActiveSubscriptions = activeSubscriptions,
                TotalDeliveries = deliveryStats?.Total ?? 0,
                SuccessfulDeliveries = deliveryStats?.Succeeded ?? 0,
                FailedDeliveries = deliveryStats?.Failed ?? 0,
                PendingDeliveries = deliveryStats?.Pending ?? 0,
                AbandonedDeliveries = deliveryStats?.Abandoned ?? 0,
                SuccessRate = deliveryStats?.Total > 0
                    ? Math.Round((double)(deliveryStats.Succeeded) / deliveryStats.Total * 100, 2)
                    : 0,
                AverageResponseTimeMs = Math.Round(deliveryStats?.AvgDuration ?? 0, 2),
                LastDeliveryUtc = lastDelivery == default ? null : lastDelivery
            };
        });
        scope.Complete();
        return stats;
    }

    #endregion

    #region Utilities

    public string GenerateSecret()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    public async Task<string?> RegenerateSecretAsync(Guid subscriptionId, CancellationToken ct = default)
    {
        var newSecret = GenerateSecret();

        using var scope = efCoreScopeProvider.CreateScope();
        var updated = await scope.ExecuteWithContextAsync(async db =>
        {
            var subscription = await db.WebhookSubscriptions.FirstOrDefaultAsync(s => s.Id == subscriptionId, ct);
            if (subscription == null) return false;

            subscription.Secret = newSecret;
            subscription.DateUpdated = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        if (updated)
        {
            logger.LogInformation("Regenerated secret for webhook subscription {SubscriptionId}", subscriptionId);
            return newSecret;
        }

        return null;
    }

    #endregion
}
