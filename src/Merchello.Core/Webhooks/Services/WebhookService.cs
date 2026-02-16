using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Merchello.Core.Data;
using Merchello.Core.Shared.Security;
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
    private static readonly JsonSerializerOptions WebhookJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };
    private const int MinTimeoutSeconds = 1;
    private const int MaxTimeoutSeconds = 300;
    private const int SendingRecoveryGraceSeconds = 60;

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
        if (!TryValidateWebhookUrl(parameters.TargetUrl, out var urlError))
        {
            result.Messages.Add(new ResultMessage
            {
                ResultMessageType = ResultMessageType.Error,
                Message = $"Target URL is not allowed: {urlError}"
            });
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
            TimeoutSeconds = ClampTimeoutSeconds(
                parameters.TimeoutSeconds > 0
                    ? parameters.TimeoutSeconds
                    : _settings.DefaultTimeoutSeconds),
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
            if (!TryValidateWebhookUrl(parameters.TargetUrl, out var urlError))
            {
                result.Messages.Add(new ResultMessage
                {
                    ResultMessageType = ResultMessageType.Error,
                    Message = $"Target URL is not allowed: {urlError}"
                });
                return result;
            }
            subscription.TargetUrl = parameters.TargetUrl;
        }

        if (parameters.Name != null) subscription.Name = parameters.Name;
        if (parameters.IsActive.HasValue) subscription.IsActive = parameters.IsActive.Value;
        if (parameters.AuthType.HasValue) subscription.AuthType = parameters.AuthType.Value;
        if (parameters.AuthHeaderName != null) subscription.AuthHeaderName = parameters.AuthHeaderName;
        if (parameters.AuthHeaderValue != null) subscription.AuthHeaderValue = parameters.AuthHeaderValue;
        if (parameters.TimeoutSeconds.HasValue)
        {
            subscription.TimeoutSeconds = ClampTimeoutSeconds(parameters.TimeoutSeconds.Value);
        }
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

            var requestBody = JsonSerializer.Serialize(envelope, WebhookJsonOptions);
            var maxPayloadBytes = Math.Max(1, _settings.MaxPayloadSizeBytes);
            var payloadSizeBytes = Encoding.UTF8.GetByteCount(requestBody);
            var isPayloadTooLarge = payloadSizeBytes > maxPayloadBytes;
            var delivery = isPayloadTooLarge
                ? CreateRejectedWebhookDelivery(
                    subscription.Id,
                    topic,
                    subscription.TargetUrl,
                    requestBody,
                    $"Payload exceeds max size: {payloadSizeBytes} bytes > {maxPayloadBytes} bytes",
                    entityId,
                    entityType)
                : CreatePendingWebhookDelivery(
                    subscription.Id,
                    topic,
                    subscription.TargetUrl,
                    requestBody,
                    entityId,
                    entityType);

            using var scope = efCoreScopeProvider.CreateScope();
            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                db.OutboundDeliveries.Add(delivery);

                // Update subscription stats
                var sub = await db.WebhookSubscriptions.FirstAsync(s => s.Id == subscription.Id, ct);
                var now = DateTime.UtcNow;
                sub.LastTriggeredUtc = now;
                sub.DateUpdated = now;
                if (isPayloadTooLarge)
                {
                    sub.FailureCount++;
                    sub.LastFailureUtc = now;
                    sub.LastErrorMessage = delivery.ErrorMessage;
                }

                await db.SaveChangesAsync(ct);
                return true;
            });
            scope.Complete();

            deliveryIds.Add(delivery.Id);

            if (isPayloadTooLarge)
            {
                logger.LogWarning(
                    "Webhook delivery {DeliveryId} rejected for subscription {SubscriptionId}: payload size {PayloadSize} exceeds max {MaxPayloadSize} bytes",
                    delivery.Id,
                    subscription.Id,
                    payloadSizeBytes,
                    maxPayloadBytes);
                continue;
            }

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
        var delivery = await TryMarkDeliveryAsSendingAsync(deliveryId, ct);
        if (delivery == null)
        {
            return new OutboundDeliveryResult
            {
                Success = false,
                ErrorMessage = "Delivery not found or not ready for processing",
                DeliveryId = deliveryId
            };
        }

        var subscription = await GetSubscriptionAsync(delivery.ConfigurationId, ct);
        if (subscription == null)
        {
            var missingSubscriptionResult = await MarkDeliveryAbandonedAsync(
                delivery.Id,
                "Subscription not found",
                ct);
            missingSubscriptionResult.DeliveryId = deliveryId;
            return missingSubscriptionResult;
        }

        var result = await dispatcher.SendAsync(delivery, subscription, ct);
        await PersistDeliveryResultAsync(delivery, result, ct);
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

            if (parameters.Statuses is { Count: > 0 })
            {
                var statuses = parameters.Statuses.Distinct().ToArray();
                query = query.Where(d => statuses.Contains(d.Status));
            }
            else if (parameters.Status.HasValue)
            {
                query = query.Where(d => d.Status == parameters.Status.Value);
            }

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

        var delivery = CreatePendingWebhookDelivery(
            subscription.Id,
            Constants.WebhookTopics.TestPing,
            subscription.TargetUrl,
            JsonSerializer.Serialize(testPayload, WebhookJsonOptions));

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
        if (!TryValidateWebhookUrl(url, out var urlError))
        {
            return new OutboundDeliveryResult
            {
                Success = false,
                ErrorMessage = $"Invalid URL: {urlError}"
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
        var utcNow = DateTime.UtcNow;
        var staleSendingCutoff = utcNow.AddSeconds(-(MaxTimeoutSeconds + SendingRecoveryGraceSeconds));
        var recoveredStaleSendingRows = await scope.ExecuteWithContextAsync(async db =>
            await db.OutboundDeliveries
                .Where(d => d.DeliveryType == OutboundDeliveryType.Webhook &&
                            d.Status == OutboundDeliveryStatus.Sending &&
                            (d.DateSent == null || d.DateSent <= staleSendingCutoff))
                .ExecuteUpdateAsync(setters => setters
                        .SetProperty(d => d.Status, OutboundDeliveryStatus.Pending)
                        .SetProperty(d => d.NextRetryUtc, _ => (DateTime?)null),
                    ct));

        var pendingDeliveries = await scope.ExecuteWithContextAsync(async db =>
            await db.OutboundDeliveries
                .Where(d => d.DeliveryType == OutboundDeliveryType.Webhook &&
                            (d.Status == OutboundDeliveryStatus.Pending ||
                             (d.Status == OutboundDeliveryStatus.Retrying &&
                              d.NextRetryUtc != null &&
                              d.NextRetryUtc <= utcNow)))
                .OrderBy(d => d.NextRetryUtc ?? d.DateCreated)
                .Take(100)
                .Select(d => d.Id)
                .ToListAsync(ct));
        scope.Complete();

        var deliveryIds = pendingDeliveries ?? [];

        if (recoveredStaleSendingRows > 0)
        {
            logger.LogWarning(
                "Recovered {Count} stale webhook deliveries stuck in Sending state (older than {StaleSeconds}s)",
                recoveredStaleSendingRows,
                MaxTimeoutSeconds + SendingRecoveryGraceSeconds);
        }

        foreach (var deliveryId in deliveryIds)
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
                .SingleOrDefaultAsync(ct);

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

    private static bool TryValidateWebhookUrl(string url, out string error)
    {
        return UrlSecurityValidator.TryValidatePublicHttpUrl(
            url,
            requireHttps: false,
            out _,
            out error);
    }

    private static OutboundDelivery CreatePendingWebhookDelivery(
        Guid configurationId,
        string topic,
        string targetUrl,
        string requestBody,
        Guid? entityId = null,
        string? entityType = null)
    {
        return new OutboundDelivery
        {
            Id = GuidExtensions.NewSequentialGuid,
            DeliveryType = OutboundDeliveryType.Webhook,
            ConfigurationId = configurationId,
            Topic = topic,
            EntityId = entityId,
            EntityType = entityType,
            TargetUrl = targetUrl,
            RequestBody = requestBody,
            RequestHeaders = "{}",
            Status = OutboundDeliveryStatus.Pending,
            AttemptNumber = 0,
            DateCreated = DateTime.UtcNow
        };
    }

    private static OutboundDelivery CreateRejectedWebhookDelivery(
        Guid configurationId,
        string topic,
        string targetUrl,
        string requestBody,
        string errorMessage,
        Guid? entityId = null,
        string? entityType = null)
    {
        var now = DateTime.UtcNow;
        return new OutboundDelivery
        {
            Id = GuidExtensions.NewSequentialGuid,
            DeliveryType = OutboundDeliveryType.Webhook,
            ConfigurationId = configurationId,
            Topic = topic,
            EntityId = entityId,
            EntityType = entityType,
            TargetUrl = targetUrl,
            RequestBody = requestBody,
            RequestHeaders = "{}",
            Status = OutboundDeliveryStatus.Abandoned,
            ErrorMessage = errorMessage,
            AttemptNumber = 0,
            DateCreated = now,
            DateCompleted = now
        };
    }

    private async Task<OutboundDelivery?> TryMarkDeliveryAsSendingAsync(Guid deliveryId, CancellationToken ct)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var utcNow = DateTime.UtcNow;

        var delivery = await scope.ExecuteWithContextAsync(async db =>
        {
            var transitioned = await db.OutboundDeliveries
                .Where(d => d.Id == deliveryId &&
                            d.DeliveryType == OutboundDeliveryType.Webhook &&
                            (d.Status == OutboundDeliveryStatus.Pending ||
                             (d.Status == OutboundDeliveryStatus.Retrying &&
                              (d.NextRetryUtc == null || d.NextRetryUtc <= utcNow))))
                .ExecuteUpdateAsync(setters => setters
                        .SetProperty(d => d.Status, OutboundDeliveryStatus.Sending)
                        .SetProperty(
                            d => d.AttemptNumber,
                            d => d.DateSent == null && d.AttemptNumber == 1
                                ? 1
                                : d.AttemptNumber > 0
                                    ? d.AttemptNumber + 1
                                    : 1)
                        .SetProperty(d => d.DateSent, utcNow)
                        .SetProperty(d => d.NextRetryUtc, _ => (DateTime?)null)
                        .SetProperty(d => d.ErrorMessage, _ => (string?)null),
                    ct);

            if (transitioned == 0)
            {
                return null;
            }

            return await db.OutboundDeliveries
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Id == deliveryId, ct);
        });
        scope.Complete();

        return delivery;
    }

    private async Task<OutboundDeliveryResult> MarkDeliveryAbandonedAsync(
        Guid deliveryId,
        string errorMessage,
        CancellationToken ct)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var delivery = await db.OutboundDeliveries
                .FirstOrDefaultAsync(d => d.Id == deliveryId, ct);

            if (delivery == null)
            {
                return false;
            }

            var now = DateTime.UtcNow;
            delivery.Status = OutboundDeliveryStatus.Abandoned;
            delivery.ErrorMessage = errorMessage;
            delivery.DateCompleted = now;
            delivery.DateSent ??= now;
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        return new OutboundDeliveryResult
        {
            Success = false,
            ErrorMessage = errorMessage
        };
    }

    private async Task PersistDeliveryResultAsync(
        OutboundDelivery delivery,
        OutboundDeliveryResult result,
        CancellationToken ct)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var persistedDelivery = await db.OutboundDeliveries
                .FirstOrDefaultAsync(d => d.Id == delivery.Id, ct);

            if (persistedDelivery == null)
            {
                return false;
            }

            var subscription = await db.WebhookSubscriptions
                .FirstOrDefaultAsync(s => s.Id == delivery.ConfigurationId, ct);

            persistedDelivery.DurationMs = result.DurationMs;
            persistedDelivery.ResponseStatusCode = result.StatusCode;
            persistedDelivery.ResponseBody = result.ResponseBody?.Length > 10000
                ? result.ResponseBody[..10000]
                : result.ResponseBody;
            persistedDelivery.ResponseHeaders = result.ResponseHeaders;
            persistedDelivery.ErrorMessage = result.ErrorMessage;

            var now = DateTime.UtcNow;
            if (result.Success)
            {
                persistedDelivery.Status = OutboundDeliveryStatus.Succeeded;
                persistedDelivery.DateCompleted = now;

                if (subscription != null)
                {
                    subscription.SuccessCount++;
                    subscription.LastSuccessUtc = now;
                    subscription.LastErrorMessage = null;
                    subscription.DateUpdated = now;
                }
            }
            else
            {
                if (persistedDelivery.AttemptNumber < Math.Max(0, _settings.MaxRetries))
                {
                    persistedDelivery.Status = OutboundDeliveryStatus.Retrying;
                    persistedDelivery.NextRetryUtc = now.AddSeconds(GetRetryDelaySeconds(persistedDelivery.AttemptNumber));
                }
                else
                {
                    persistedDelivery.Status = OutboundDeliveryStatus.Abandoned;
                    persistedDelivery.DateCompleted = now;
                }

                if (subscription != null)
                {
                    subscription.FailureCount++;
                    subscription.LastFailureUtc = now;
                    subscription.LastErrorMessage = result.ErrorMessage;
                    subscription.DateUpdated = now;
                }
            }

            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();
    }

    private int ClampTimeoutSeconds(int timeoutSeconds)
    {
        if (timeoutSeconds <= 0)
        {
            timeoutSeconds = _settings.DefaultTimeoutSeconds;
        }

        return Math.Clamp(timeoutSeconds, MinTimeoutSeconds, MaxTimeoutSeconds);
    }

    private int GetRetryDelaySeconds(int attemptNumber)
    {
        if (_settings.RetryDelaysSeconds.Length == 0)
        {
            return 60;
        }

        var index = Math.Clamp(attemptNumber - 1, 0, _settings.RetryDelaysSeconds.Length - 1);
        return Math.Max(1, _settings.RetryDelaysSeconds[index]);
    }

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
